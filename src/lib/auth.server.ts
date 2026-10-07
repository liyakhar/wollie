import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { getRequest } from '@tanstack/react-start/server'
import { getPrisma } from '#/db.server'
import { PRIVACY_VERSION, TERMS_VERSION } from '#/lib/legal-versions'
import {
  accountActionEmail,
  isTransactionalEmailConfigured,
  sendAccountEmail,
} from '#/server/email.server'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)
}

async function uniqueUsername(base: string) {
  const prisma = getPrisma()
  let username = slugify(base) || 'agent'
  let attempt = 0

  while (true) {
    const candidate = attempt === 0 ? username : `${username}-${attempt}`
    const existing = await prisma.profile.findUnique({
      where: { username: candidate },
    })
    if (!existing) return candidate
    attempt += 1
  }
}

type Auth = ReturnType<typeof createAuth>

const requestAuth = new WeakMap<Request, Auth>()
let fallbackAuth: Auth | undefined

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not set')
  }

  const trustedOrigins =
    process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:*',
          'http://127.0.0.1:*',
        ]
      : [process.env.BETTER_AUTH_URL, process.env.SITE_URL, 'https://getwollie.com', 'https://www.getwollie.com']
          .filter((origin): origin is string => Boolean(origin))
          .map((origin) => origin.replace(/\/$/, ''))
  const canSendAccountEmail = isTransactionalEmailConfigured()

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins,
    secret,
    database: prismaAdapter(getPrisma(), {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      ...(canSendAccountEmail
        ? {
            sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
              const content = accountActionEmail(
                'Reset your Wollie password',
                'Use this secure link to choose a new Wollie password.',
                url,
              )
              await sendAccountEmail({
                to: user.email,
                subject: 'Reset your Wollie password',
                ...content,
              })
            },
          }
        : {}),
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      additionalFields: {
        termsAcceptedAt: { type: 'date', required: true, returned: false },
        termsVersion: { type: 'string', required: true, returned: false },
        privacyVersion: { type: 'string', required: true, returned: false },
      },
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: async ({ user, url }) => {
          const content = accountActionEmail(
            'Confirm Wollie account deletion',
            'This permanently removes your Wollie account and locally stored financial data. This link expires in 24 hours.',
            url,
          )
          await sendAccountEmail({
            to: user.email,
            subject: 'Confirm Wollie account deletion',
            ...content,
          })
        },
        beforeDelete: async (user) => {
          const { prepareUserDeletion } = await import('#/server/user-deletion.server')
          await prepareUserDeletion(user.id)
        },
      },
    },
    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (
              !user.termsAcceptedAt ||
              user.termsVersion !== TERMS_VERSION ||
              user.privacyVersion !== PRIVACY_VERSION
            ) {
              throw new APIError('BAD_REQUEST', {
                message: 'Accept the current Terms and Privacy Notice to create an account.',
              })
            }

            return {
              data: {
                termsAcceptedAt: new Date(),
                termsVersion: TERMS_VERSION,
                privacyVersion: PRIVACY_VERSION,
              },
            }
          },
          after: async (user) => {
            const prisma = getPrisma()
            const base = user.name || user.email.split('@')[0]
            const username = await uniqueUsername(base)
            await prisma.profile.create({
              data: {
                userId: user.id,
                username,
                field: 'FINANCE',
                // New accounts see the one-screen "Start free" step once.
                onboarded: false,
              },
            })
          },
        },
      },
    },
    plugins: [tanstackStartCookies()],
  })
}

export function getAuth() {
  try {
    const request = getRequest()
    const cached = requestAuth.get(request)
    if (cached) return cached

    const instance = createAuth()
    requestAuth.set(request, instance)
    return instance
  } catch {
    if (!fallbackAuth) {
      fallbackAuth = createAuth()
    }
    return fallbackAuth
  }
}

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuth(), prop, receiver)
  },
})
