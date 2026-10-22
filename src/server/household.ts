import { createServerFn } from '@tanstack/react-start'
import { Prisma } from '#/generated/prisma/client'
import { getSiteUrl } from '#/lib/site'
import {
  createInvitationToken,
  hashInvitationToken,
  normalizeInvitationEmail,
} from '#/lib/household-invitations'
import { incomeSplit, validateBasisPointShares } from '#/lib/household-finance'
import { isFixed } from '#/lib/money-insights'
import { parseDate } from '#/lib/money-cycle'
import { loadMoneySnapshot } from '#/server/finance'
import { getDb } from '#/server/db-access.server'
import { getSessionUser } from '#/server/session.server'
import {
  requireFinanceHousehold,
  requireHouseholdOwner,
} from '#/server/household-access.server'

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000

export const getHouseholdOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const context = await requireFinanceHousehold()
  const prisma = await getDb()
  await expireOldInvitations(prisma, context.workspaceId)
  const workspace = await prisma.budgetWorkspace.findUniqueOrThrow({
    where: { id: context.workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      accounts: {
        include: {
          ownershipShares: true,
          bankConnection: { select: { userId: true, status: true, lastSyncedAt: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      invitations: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  const now = new Date()
  const [snapshot, income] = await Promise.all([
    loadMoneySnapshot(context.workspaceId),
    prisma.financeTransaction.findMany({
      where: {
        workspaceId: context.workspaceId,
        amountMinor: { gt: 0 },
        postedAt: { gte: new Date(now.getFullYear(), now.getMonth() - 4, 1) },
        category: { name: 'Income' },
      },
      select: { accountId: true, amountMinor: true, postedAt: true },
    }),
  ])
  const split = incomeSplit({
    memberIds: workspace.members.map((member) => member.id),
    accounts: workspace.accounts.map((account) => ({ id: account.id, ownership: account.ownershipShares })),
    transactions: income.map((transaction) => ({
      accountId: transaction.accountId,
      amount: transaction.amountMinor / 100,
      category: 'Income',
      date: transaction.postedAt.toISOString(),
    })),
  })

  return {
    workspace: { id: workspace.id, name: workspace.name, currency: workspace.currency },
    incomeSplit: split,
    lastMonthBills: lastMonthBills(snapshot.transactions),
    currentMemberId: context.memberId,
    currentRole: context.role,
    members: workspace.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name || member.user.email.split('@')[0],
      email: member.user.email,
      role: member.role,
      householdShareBasisPoints: member.householdShareBasisPoints,
    })),
    accounts: workspace.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      institution: account.institution || 'Connected bank',
      type: account.type,
      currency: account.currency,
      balanceMinor: account.balanceMinor,
      lastSyncedAt: account.lastSyncedAt?.toISOString() || null,
      connectionOwnerUserId: account.bankConnection?.userId || null,
      connectionStatus: account.bankConnection?.status || 'NOT_CONNECTED',
      connectionLastSyncedAt: account.bankConnection?.lastSyncedAt?.toISOString() || null,
      ownership: account.ownershipShares.map((share) => ({
        memberId: share.memberId,
        shareBasisPoints: share.shareBasisPoints,
      })),
    })),
    invitations: context.role === 'OWNER'
      ? workspace.invitations.map((invitation) => ({
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expiresAt.toISOString(),
        }))
      : [],
  }
})

/** Rent and repeating bills paid last calendar month, all accounts together. */
function lastMonthBills(transactions: Awaited<ReturnType<typeof loadMoneySnapshot>>['transactions']) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const total = transactions
    .filter((transaction) => {
      const date = parseDate(transaction.date, now)
      return isFixed(transaction) && date !== null && date >= start && date < end
    })
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
  return Math.round(total * 100) / 100
}

export const createHouseholdInvitation = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => ({ email: normalizeInvitationEmail(String(data?.email || '')) }))
  .handler(async ({ data }) => {
    const context = await requireHouseholdOwner()
    const prisma = await getDb()
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: context.workspaceId },
      include: { user: { select: { email: true } } },
    })
    if (members.length >= 2) throw new Error('This household already has two members.')
    if (members.some((member) => member.user.email.toLowerCase() === data.email)) {
      throw new Error('That person is already in this household.')
    }

    const token = createInvitationToken()
    const tokenHash = await hashInvitationToken(token)
    const expiresAt = new Date(Date.now() + INVITATION_LIFETIME_MS)
    const invitation = await prisma.$transaction(async (tx) => {
      await tx.householdInvitation.updateMany({
        where: { workspaceId: context.workspaceId, email: data.email, status: 'PENDING' },
        data: { status: 'REVOKED' },
      })
      return tx.householdInvitation.create({
        data: {
          workspaceId: context.workspaceId,
          email: data.email,
          tokenHash,
          expiresAt,
          createdByUserId: context.userId,
        },
      })
    })
    const url = `${getSiteUrl()}/invite/${token}`
    let delivery: 'sent' | 'copy-link' = 'sent'
    try {
      const { accountActionEmail, sendAccountEmail } = await import('#/server/email.server')
      const content = accountActionEmail(
        'Join your Wollie household',
        `${context.user.name || context.user.email} invited you to share a household budget in Wollie. Sign in with ${data.email} to accept.`,
        url,
      )
      await sendAccountEmail({ to: data.email, subject: 'Join your Wollie household', ...content })
    } catch (error) {
      console.error('Household invitation email was not delivered:', error instanceof Error ? error.message : error)
      delivery = 'copy-link'
    }
    return { id: invitation.id, email: data.email, expiresAt: expiresAt.toISOString(), url, delivery }
  })

export const revokeHouseholdInvitation = createServerFn({ method: 'POST' })
  .validator((data: { invitationId: string }) => ({ invitationId: String(data?.invitationId || '') }))
  .handler(async ({ data }) => {
    const context = await requireHouseholdOwner()
    const prisma = await getDb()
    const result = await prisma.householdInvitation.updateMany({
      where: { id: data.invitationId, workspaceId: context.workspaceId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    })
    if (result.count !== 1) throw new Error('Invitation not found or already closed.')
    return { revoked: true }
  })

export const getHouseholdInvitation = createServerFn({ method: 'GET' })
  .validator((data: { token: string }) => ({ token: String(data?.token || '') }))
  .handler(async ({ data }) => {
    let tokenHash: string
    try {
      tokenHash = await hashInvitationToken(data.token)
    } catch {
      return invalidInvitation()
    }
    const prisma = await getDb()
    const invitation = await prisma.householdInvitation.findUnique({
      where: { tokenHash },
      include: {
        workspace: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
      },
    })
    if (!invitation) return invalidInvitation()
    const status = invitation.status === 'PENDING' && invitation.expiresAt <= new Date()
      ? 'EXPIRED'
      : invitation.status
    return {
      householdName: invitation.workspace.name,
      invitedBy: invitation.createdBy.name || invitation.createdBy.email,
      emailHint: maskEmail(invitation.email),
      status,
      expiresAt: invitation.expiresAt.toISOString(),
    }
  })

export const acceptHouseholdInvitation = createServerFn({ method: 'POST' })
  .validator((data: { token: string }) => ({ token: String(data?.token || '') }))
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw new Error('Sign in with the invited email before accepting.')
    const tokenHash = await hashInvitationToken(data.token)
    const prisma = await getDb()

    return prisma.$transaction(async (tx) => {
      const invitation = await tx.householdInvitation.findUnique({ where: { tokenHash } })
      if (!invitation || invitation.status !== 'PENDING') {
        throw new Error('This invitation is no longer available.')
      }
      if (invitation.expiresAt <= new Date()) {
        throw new Error('This invitation has expired. Ask the household owner for a new one.')
      }
      if (normalizeInvitationEmail(user.email) !== invitation.email) {
        throw new Error(`Sign in as ${maskEmail(invitation.email)} to accept this invitation.`)
      }

      const existingTarget = await tx.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
      })
      if (existingTarget) {
        await tx.householdInvitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        })
        return { accepted: true, workspaceId: invitation.workspaceId }
      }

      const memberCount = await tx.workspaceMember.count({ where: { workspaceId: invitation.workspaceId } })
      if (memberCount >= 2) throw new Error('This household already has two members.')

      const otherMembership = await tx.workspaceMember.findFirst({
        where: { userId: user.id, workspaceId: { not: invitation.workspaceId } },
        include: { workspace: true },
      })
      if (otherMembership) {
        const workspace = await tx.budgetWorkspace.findUniqueOrThrow({
          where: { id: otherMembership.workspaceId },
          include: {
            _count: { select: { accounts: true, budgetMonths: true, recurringPayments: true, bankConnections: true } },
          },
        })
        const containsFinanceData = Object.values(workspace._count).some((count) => count > 0)
        if (containsFinanceData || workspace.userId !== user.id) {
          throw new Error('Your existing Wollie household contains financial data. It cannot be merged automatically.')
        }
        await tx.budgetWorkspace.delete({ where: { id: workspace.id } })
      }

      await tx.workspaceMember.updateMany({
        where: { workspaceId: invitation.workspaceId, role: 'OWNER' },
        data: { householdShareBasisPoints: 5_000 },
      })
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: 'MEMBER',
          householdShareBasisPoints: 5_000,
        },
      })
      const consumed = await tx.householdInvitation.updateMany({
        where: { id: invitation.id, status: 'PENDING', acceptedAt: null },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      })
      if (consumed.count !== 1) throw new Error('This invitation was already used.')
      return { accepted: true, workspaceId: invitation.workspaceId }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  })

export const updateHouseholdShares = createServerFn({ method: 'POST' })
  .validator((data: { shares: Array<{ memberId: string; shareBasisPoints: number }> }) => ({
    shares: validateBasisPointShares((data?.shares || []).map((share) => ({
      memberId: String(share.memberId || ''),
      shareBasisPoints: Number(share.shareBasisPoints),
    }))),
  }))
  .handler(async ({ data }) => {
    const context = await requireHouseholdOwner()
    const prisma = await getDb()
    const members = await prisma.workspaceMember.findMany({ where: { workspaceId: context.workspaceId } })
    assertExactMembers(data.shares, members.map((member) => member.id))
    await prisma.$transaction(data.shares.map((share) => prisma.workspaceMember.update({
      where: { id: share.memberId },
      data: { householdShareBasisPoints: share.shareBasisPoints },
    })))
    return { saved: true }
  })

export const updateAccountOwnership = createServerFn({ method: 'POST' })
  .validator((data: { accountId: string; shares: Array<{ memberId: string; shareBasisPoints: number }> }) => ({
    accountId: String(data?.accountId || ''),
    shares: validateBasisPointShares((data?.shares || []).map((share) => ({
      memberId: String(share.memberId || ''),
      shareBasisPoints: Number(share.shareBasisPoints),
    }))),
  }))
  .handler(async ({ data }) => {
    const context = await requireFinanceHousehold()
    const prisma = await getDb()
    const [account, members] = await Promise.all([
      prisma.financialAccount.findFirst({ where: { id: data.accountId, workspaceId: context.workspaceId } }),
      prisma.workspaceMember.findMany({ where: { workspaceId: context.workspaceId } }),
    ])
    if (!account) throw new Error('Account not found.')
    assertExactMembers(data.shares, members.map((member) => member.id))
    await prisma.$transaction(async (tx) => {
      await tx.accountOwnership.deleteMany({ where: { accountId: account.id } })
      await tx.accountOwnership.createMany({
        data: data.shares.map((share) => ({ accountId: account.id, ...share })),
      })
    })
    return { saved: true }
  })

export const removeHouseholdMember = createServerFn({ method: 'POST' })
  .validator((data: { memberId: string }) => ({ memberId: String(data?.memberId || '') }))
  .handler(async ({ data }) => {
    const context = await requireHouseholdOwner()
    const prisma = await getDb()
    const member = await prisma.workspaceMember.findFirst({
      where: { id: data.memberId, workspaceId: context.workspaceId, role: 'MEMBER' },
      include: { user: { select: { email: true } } },
    })
    if (!member) throw new Error('Household member not found.')

    const connectedBanks = await prisma.bankConnection.count({
      where: { workspaceId: context.workspaceId, userId: member.userId },
    })
    if (connectedBanks > 0) {
      throw new Error('Your partner must disconnect their bank accounts before leaving the household.')
    }

    await prisma.$transaction(async (tx) => {
      const ownedAccounts = await tx.accountOwnership.findMany({
        where: { memberId: member.id },
      })
      for (const share of ownedAccounts) {
        const ownerShare = await tx.accountOwnership.findUnique({
          where: { accountId_memberId: { accountId: share.accountId, memberId: context.memberId } },
        })
        await tx.accountOwnership.upsert({
          where: { accountId_memberId: { accountId: share.accountId, memberId: context.memberId } },
          create: {
            accountId: share.accountId,
            memberId: context.memberId,
            shareBasisPoints: share.shareBasisPoints,
          },
          update: {
            shareBasisPoints: (ownerShare?.shareBasisPoints || 0) + share.shareBasisPoints,
          },
        })
      }
      await tx.workspaceMember.delete({ where: { id: member.id } })
      await tx.workspaceMember.update({
        where: { id: context.memberId },
        data: { householdShareBasisPoints: 10_000 },
      })
      await tx.householdInvitation.updateMany({
        where: { workspaceId: context.workspaceId, email: member.user.email, status: 'PENDING' },
        data: { status: 'REVOKED' },
      })
    })
    return { removed: true }
  })

async function expireOldInvitations(prisma: Awaited<ReturnType<typeof getDb>>, workspaceId: string) {
  await prisma.householdInvitation.updateMany({
    where: { workspaceId, status: 'PENDING', expiresAt: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  })
}

function assertExactMembers(shares: Array<{ memberId: string }>, memberIds: string[]) {
  const actual = [...shares.map((share) => share.memberId)].sort()
  const expected = [...memberIds].sort()
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
    throw new Error('Shares must include every household member exactly once.')
  }
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'the invited email'
  return `${local.slice(0, 1)}${'*'.repeat(Math.min(Math.max(local.length - 1, 1), 6))}@${domain}`
}

function invalidInvitation() {
  return {
    householdName: 'Wollie household',
    invitedBy: 'A household owner',
    emailHint: 'the invited email',
    status: 'INVALID' as const,
    expiresAt: null,
  }
}
