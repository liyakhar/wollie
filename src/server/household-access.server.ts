import { getDb } from '#/server/db-access.server'
import { getSessionUser } from '#/server/session.server'

export type FinanceHouseholdContext = {
  userId: string
  workspaceId: string
  ownerUserId: string
  memberId: string
  role: 'OWNER' | 'MEMBER'
  householdShareBasisPoints: number
}

export async function getOrCreateFinanceHousehold(
  userId: string,
  currency = 'EUR',
): Promise<FinanceHouseholdContext> {
  const prisma = await getDb()
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId, workspace: { demo: false } },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })
  if (existingMembership) return toContext(userId, existingMembership)

  const ownedWorkspace = await prisma.budgetWorkspace.findFirst({
    where: { userId, demo: false },
    orderBy: { createdAt: 'asc' },
  })
  if (ownedWorkspace) {
    const membership = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: ownedWorkspace.id, userId },
      },
      create: {
        workspaceId: ownedWorkspace.id,
        userId,
        role: 'OWNER',
        householdShareBasisPoints: 10_000,
      },
      update: { role: 'OWNER' },
      include: { workspace: true },
    })
    return toContext(userId, membership)
  }

  const workspace = await prisma.budgetWorkspace.create({
    data: {
      userId,
      name: 'Personal budget',
      currency,
      demo: false,
      members: {
        create: {
          userId,
          role: 'OWNER',
          householdShareBasisPoints: 10_000,
        },
      },
    },
    include: { members: true },
  })
  const member = workspace.members[0]
  if (!member) throw new Error('Could not create household membership.')
  return {
    userId,
    workspaceId: workspace.id,
    ownerUserId: workspace.userId,
    memberId: member.id,
    role: member.role,
    householdShareBasisPoints: member.householdShareBasisPoints,
  }
}

export async function getFinanceHouseholdForUser(userId: string) {
  const prisma = await getDb()
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspace: { demo: false } },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })
  if (membership) return toContext(userId, membership)

  const owned = await prisma.budgetWorkspace.findFirst({
    where: { userId, demo: false },
    orderBy: { createdAt: 'asc' },
  })
  return owned ? getOrCreateFinanceHousehold(userId, owned.currency) : null
}

export async function requireFinanceHousehold() {
  const user = await getSessionUser()
  if (!user) throw new Error('Sign in required.')
  const context = await getOrCreateFinanceHousehold(user.id)
  return { ...context, user }
}

export async function requireHouseholdOwner() {
  const context = await requireFinanceHousehold()
  if (context.role !== 'OWNER') throw new Error('Only the household owner can do that.')
  return context
}

function toContext(
  userId: string,
  membership: {
    id: string
    role: 'OWNER' | 'MEMBER'
    householdShareBasisPoints: number
    workspace: { id: string; userId: string }
  },
): FinanceHouseholdContext {
  return {
    userId,
    workspaceId: membership.workspace.id,
    ownerUserId: membership.workspace.userId,
    memberId: membership.id,
    role: membership.role,
    householdShareBasisPoints: membership.householdShareBasisPoints,
  }
}
