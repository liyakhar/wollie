import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { Category } from '#/generated/prisma/client'
import { loginSearch } from '#/lib/auth-nav'
import { getDb } from '#/server/db-access.server'
import { getSessionUser } from '#/server/session.server'
import { emitNotification } from '#/server/notifications.server'

export const getProfile = createServerFn({ method: 'GET' })
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    const prisma = await getDb()
    const profile = await prisma.profile.findUnique({
      where: { username: data.username },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            pinnedPostId: true,
            createdAt: true,
            pinnedPost: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    profile: { select: { username: true, field: true } },
                  },
                },
                _count: { select: { likes: true, comments: true } },
              },
            },
            posts: {
              orderBy: { createdAt: 'desc' },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    profile: { select: { username: true, field: true } },
                  },
                },
                _count: { select: { likes: true, comments: true } },
              },
            },
            _count: {
              select: {
                followers: true,
                following: true,
                posts: true,
              },
            },
          },
        },
      },
    })

    if (!profile) return null

    const viewer = await getSessionUser()
    let isFollowing = false
    let isOwner = false

    if (viewer) {
      isOwner = viewer.id === profile.userId
      if (!isOwner) {
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewer.id,
              followingId: profile.userId,
            },
          },
        })
        isFollowing = Boolean(follow)
      }
    }

    const posts = profile.user.posts.filter(
      (p) => p.id !== profile.user.pinnedPostId,
    )

    return {
      ...profile,
      user: {
        ...profile.user,
        posts,
      },
      isFollowing,
      isOwner,
    }
  })

export const updateProfile = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      bio?: string
      headline?: string
      field?: Category
      username?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const prisma = await getDb()
    const user = await getSessionUser()
    if (!user) {
      throw new Error('Sign in required')
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    })
    if (!profile) {
      throw new Error('Profile not found')
    }

    if (data.username && data.username !== profile.username) {
      const taken = await prisma.profile.findUnique({
        where: { username: data.username },
      })
      if (taken) {
        throw new Error('Username already taken')
      }
    }

    return prisma.profile.update({
      where: { userId: user.id },
      data: {
        bio: data.bio?.trim(),
        headline: data.headline?.trim(),
        field: data.field,
        username: data.username?.trim().toLowerCase(),
      },
    })
  })

export const completeOnboarding = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      username: string
      field: Category
      headline?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const prisma = await getDb()
    const user = await getSessionUser()
    if (!user) {
      throw new Error('Sign in required')
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    })
    if (!profile) {
      throw new Error('Profile not found')
    }

    const username = data.username.trim().toLowerCase()
    if (!username || !/^[a-z0-9-]+$/.test(username)) {
      throw new Error('Choose a username with letters, numbers, and hyphens only')
    }
    if (username !== profile.username) {
      const taken = await prisma.profile.findUnique({
        where: { username },
      })
      if (taken) {
        throw new Error('Username already taken')
      }
    }

    return prisma.profile.update({
      where: { userId: user.id },
      data: {
        username,
        field: data.field,
        headline: data.headline?.trim() || null,
        onboarded: true,
      },
    })
  })

export const toggleFollow = createServerFn({ method: 'POST' })
  .inputValidator((data: { username: string }) => data)
  .handler(async ({ data }) => {
    const prisma = await getDb()
    const user = await getSessionUser()
    if (!user) {
      throw new Error('Sign in to follow')
    }

    const profile = await prisma.profile.findUnique({
      where: { username: data.username },
    })
    if (!profile) {
      throw new Error('User not found')
    }
    if (profile.userId === user.id) {
      throw new Error('You cannot follow yourself')
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: profile.userId,
        },
      },
    })

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } })
      return { following: false }
    }

    await prisma.follow.create({
      data: {
        followerId: user.id,
        followingId: profile.userId,
      },
    })

    void emitNotification({
      userId: profile.userId,
      actorId: user.id,
      type: 'FOLLOW',
    })

    return { following: true }
  })

export const getSuggestedProfiles = createServerFn({ method: 'GET' })
  .inputValidator((data: { field: Category }) => data)
  .handler(async ({ data }) => {
    const prisma = await getDb()
    const user = await getSessionUser()

    return prisma.profile.findMany({
      where: {
        field: data.field,
        ...(user ? { userId: { not: user.id } } : {}),
        user: { posts: { some: {} } },
      },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            _count: { select: { posts: true, followers: true } },
          },
        },
      },
    })
  })

export const followMany = createServerFn({ method: 'POST' })
  .inputValidator((data: { usernames: string[] }) => data)
  .handler(async ({ data }) => {
    const prisma = await getDb()
    const user = await getSessionUser()
    if (!user) {
      throw new Error('Sign in to follow')
    }

    const profiles = await prisma.profile.findMany({
      where: {
        username: { in: data.usernames },
        userId: { not: user.id },
      },
      select: { userId: true },
    })

    if (profiles.length === 0) {
      return { followed: 0 }
    }

    await prisma.follow.createMany({
      data: profiles.map((profile) => ({
        followerId: user.id,
        followingId: profile.userId,
      })),
      skipDuplicates: true,
    })

    for (const profile of profiles) {
      void emitNotification({
        userId: profile.userId,
        actorId: user.id,
        type: 'FOLLOW',
      })
    }

    return { followed: profiles.length }
  })

export const searchProfiles = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { q?: string; category?: Category; sort?: 'popular' | 'recent' }) => data,
  )
  .handler(async ({ data }) => {
    const prisma = await getDb()
    const q = data.q?.trim()
    const sortPopular = data.sort !== 'recent'

    return prisma.profile.findMany({
      where: {
        user: { posts: { some: {} } },
        ...(data.category ? { field: data.category } : {}),
        ...(q
          ? {
              OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { headline: { contains: q, mode: 'insensitive' } },
                { bio: { contains: q, mode: 'insensitive' } },
                { user: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      take: 24,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            _count: { select: { posts: true, followers: true } },
          },
        },
      },
      orderBy: sortPopular
        ? [{ user: { followers: { _count: 'desc' } } }, { updatedAt: 'desc' }]
        : { updatedAt: 'desc' },
    })
  })

export const getMyProfile = createServerFn({ method: 'GET' }).handler(
  async () => {
    const prisma = await getDb()
    const user = await getSessionUser()
    if (!user) return null

    return prisma.profile.findUnique({
      where: { userId: user.id },
    })
  },
)

export const requireSignedIn = createServerFn({ method: 'GET' })
  .inputValidator((data: { redirect?: string } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) {
      // First visit: show the intro. After that, go straight to sign in.
      const { getCookie } = await import('@tanstack/react-start/server')
      if (getCookie('wollie_intro') !== '1') {
        throw redirect({ to: '/start', search: { redirect: data.redirect ?? '/app' } })
      }
      throw redirect({
        to: '/login',
        search: loginSearch({ redirect: data.redirect ?? '/app' }),
      })
    }
    return user
  })

export const requireOnboarded = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getSessionUser()
    if (!user) return

    const prisma = await getDb()
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { onboarded: true },
    })

    if (profile && !profile.onboarded) {
      throw redirect({ to: '/welcome', search: { redirect: '/app' } })
    }
  },
)

export const requireNeedsOnboarding = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getSessionUser()
    if (!user) {
      throw redirect({ to: '/login', search: loginSearch({ signup: true }) })
    }

    const prisma = await getDb()
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { onboarded: true },
    })

    if (profile?.onboarded) {
      throw redirect({ to: '/app/explore' })
    }
  },
)
