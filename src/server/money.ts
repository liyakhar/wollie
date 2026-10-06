import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { FINANCE_CATEGORIES } from '#/lib/finance-demo'
import { buildCyclePlan, payCycle, detectPayday, type Goal } from '#/lib/money-cycle'
import { toMoneyOverview } from '#/lib/money-overview'
import { getDb } from '#/server/db-access.server'
import { ensureDevSampleData } from '#/server/dev-sample.server'
import { ensurePushScheduler } from '#/server/push.server'
import { loadMoneySnapshot } from '#/server/finance'
import { requireFinanceHousehold } from '#/server/household-access.server'

async function requireHousehold() {
  const context = await requireFinanceHousehold()
  await ensureDevSampleData(context.userId, context.workspaceId)
  ensurePushScheduler()
  setResponseHeader('Cache-Control', 'private, no-store, max-age=0')
  return context
}

function toMinor(value: number) {
  return Math.round(value * 100)
}

function assertAmount(value: unknown, label: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) {
    throw new Error(`Enter a valid ${label}.`)
  }
  return amount
}

/** The current cycle start for a workspace, used to key goal contributions. */
async function currentCycleStart(workspaceId: string, paydayDay: number | null) {
  let day = paydayDay
  if (!day) {
    const snapshot = await loadMoneySnapshot(workspaceId)
    day = detectPayday(snapshot.transactions)
  }
  const start = payCycle(new Date(), { paydayDay: day }).start
  return new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()))
}

/* ------------------------------ Read ------------------------------ */

export const buildMoneyOverview = createServerOnlyFn(async (workspaceId: string) => {
  const prisma = await getDb()
  const [snapshot, workspace] = await Promise.all([
    loadMoneySnapshot(workspaceId),
    prisma.budgetWorkspace.findUnique({
      where: { id: workspaceId },
      select: {
        paydayDay: true,
        categories: { select: { name: true } },
        categoryBudgets: { include: { category: { select: { name: true } } } },
        savingsGoals: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'asc' },
          include: { contributions: true },
        },
      },
    }),
  ])

  const paydaySetting = workspace?.paydayDay ?? null
  const detected = paydaySetting ? null : detectPayday(snapshot.transactions)
  const cycle = payCycle(new Date(), { paydayDay: paydaySetting ?? detected })
  const cycleKey = `${cycle.start.getFullYear()}-${cycle.start.getMonth()}-${cycle.start.getDate()}`

  const goals: Goal[] = (workspace?.savingsGoals ?? []).map((goal) => {
    const current = goal.contributions.find((item) => {
      const date = item.cycleStart
      return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}` === cycleKey
    })
    const contributed = goal.contributions.reduce((sum, item) => sum + item.amountMinor, 0)
    return {
      id: goal.id,
      name: goal.name,
      icon: goal.icon,
      target: goal.targetMinor === null ? null : goal.targetMinor / 100,
      monthly: goal.monthlyMinor / 100,
      targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
      saved: (goal.startingMinor + contributed) / 100,
      savedThisCycle: (current?.amountMinor ?? 0) / 100,
      skippedThisCycle: current?.skipped ?? false,
    }
  })

  const plan = buildCyclePlan({
    accounts: snapshot.accounts,
    transactions: snapshot.transactions,
    recurringPayments: snapshot.recurringPayments,
    budgets: (workspace?.categoryBudgets ?? []).map((budget) => ({
      id: budget.id,
      category: budget.category.name,
      limit: budget.limitMinor / 100,
    })),
    goals,
    paydayDay: paydaySetting ?? detected,
  })

  const categories = [...new Set([
    ...FINANCE_CATEGORIES,
    ...(workspace?.categories ?? []).map((category) => category.name),
    ...snapshot.transactions.map((transaction) => transaction.category),
  ])]

  return toMoneyOverview({
    plan,
    currency: snapshot.currency,
    hasAccounts: snapshot.accounts.length > 0,
    syncStatus: snapshot.syncStatus,
    paydaySetting,
    transactions: snapshot.transactions,
    categories,
  })
})

export const getMoneyOverview = createServerFn({ method: 'GET' }).handler(async () => {
  const context = await requireHousehold()
  return buildMoneyOverview(context.workspaceId)
})

/* ------------------------------ Budgets ------------------------------ */

export const saveBudget = createServerFn({ method: 'POST' })
  .validator((data: { category: string; limit: number }) => {
    const category = String(data?.category ?? '').trim().slice(0, 60)
    if (!category) throw new Error('Choose a category.')
    return { category, limit: assertAmount(data?.limit, 'monthly limit') }
  })
  .handler(async ({ data }) => {
    const context = await requireHousehold()
    const prisma = await getDb()
    const category = await prisma.transactionCategory.upsert({
      where: { workspaceId_name: { workspaceId: context.workspaceId, name: data.category } },
      create: {
        workspaceId: context.workspaceId,
        name: data.category,
        system: (FINANCE_CATEGORIES as readonly string[]).includes(data.category),
      },
      update: {},
    })
    if (data.limit === 0) {
      await prisma.categoryBudget.deleteMany({ where: { categoryId: category.id, workspaceId: context.workspaceId } })
      return { saved: true }
    }
    await prisma.categoryBudget.upsert({
      where: { categoryId: category.id },
      create: { workspaceId: context.workspaceId, categoryId: category.id, limitMinor: toMinor(data.limit) },
      update: { limitMinor: toMinor(data.limit) },
    })
    return { saved: true }
  })

/* ------------------------------ Goals ------------------------------ */

const GOAL_ICONS = ['target', 'plane', 'shield', 'sprout', 'home', 'laptop', 'gift', 'graduation-cap', 'car', 'heart'] as const

export const saveGoal = createServerFn({ method: 'POST' })
  .validator((data: {
    id?: string
    name: string
    icon?: string
    target?: number | null
    monthly: number
    targetDate?: string | null
    starting?: number
  }) => {
    const name = String(data?.name ?? '').trim().slice(0, 60)
    if (!name) throw new Error('Name the goal.')
    const icon = GOAL_ICONS.includes(data?.icon as (typeof GOAL_ICONS)[number]) ? data.icon! : 'target'
    const target = data?.target === null || data?.target === undefined || Number(data.target) === 0
      ? null
      : assertAmount(data.target, 'target')
    const targetDate = data?.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(data.targetDate) ? data.targetDate : null
    return {
      id: data?.id ? String(data.id) : undefined,
      name,
      icon,
      target,
      monthly: assertAmount(data?.monthly ?? 0, 'monthly amount'),
      targetDate,
      starting: data?.starting === undefined ? undefined : assertAmount(data.starting, 'amount saved so far'),
    }
  })
  .handler(async ({ data }) => {
    const context = await requireHousehold()
    const prisma = await getDb()
    const values = {
      name: data.name,
      icon: data.icon,
      targetMinor: data.target === null ? null : toMinor(data.target),
      monthlyMinor: toMinor(data.monthly),
      targetDate: data.targetDate ? new Date(`${data.targetDate}T00:00:00.000Z`) : null,
      ...(data.starting === undefined ? {} : { startingMinor: toMinor(data.starting) }),
    }
    if (data.id) {
      const updated = await prisma.savingsGoal.updateMany({
        where: { id: data.id, workspaceId: context.workspaceId },
        data: values,
      })
      if (updated.count === 0) throw new Error('Goal not found.')
      return { id: data.id }
    }
    const goal = await prisma.savingsGoal.create({ data: { ...values, workspaceId: context.workspaceId } })
    return { id: goal.id }
  })

export const archiveGoal = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => ({ id: String(data?.id ?? '') }))
  .handler(async ({ data }) => {
    const context = await requireHousehold()
    const prisma = await getDb()
    await prisma.savingsGoal.updateMany({
      where: { id: data.id, workspaceId: context.workspaceId },
      data: { archivedAt: new Date() },
    })
    return { archived: true }
  })

/**
 * Records this cycle for a goal: the user moved money ("saved"), skipped
 * this cycle ("skip"), or wants to undo either ("undo").
 */
export const recordGoalCycle = createServerFn({ method: 'POST' })
  .validator((data: { goalId: string; action: 'saved' | 'skip' | 'undo'; amount?: number }) => {
    if (!['saved', 'skip', 'undo'].includes(data?.action)) throw new Error('Unknown action.')
    return {
      goalId: String(data?.goalId ?? ''),
      action: data.action,
      amount: data.action === 'saved' ? assertAmount(data?.amount ?? 0, 'amount') : 0,
    }
  })
  .handler(async ({ data }) => {
    const context = await requireHousehold()
    const prisma = await getDb()
    const goal = await prisma.savingsGoal.findFirst({
      where: { id: data.goalId, workspaceId: context.workspaceId },
      include: { workspace: { select: { paydayDay: true } } },
    })
    if (!goal) throw new Error('Goal not found.')
    const cycleStart = await currentCycleStart(context.workspaceId, goal.workspace.paydayDay)
    const key = { goalId_cycleStart: { goalId: goal.id, cycleStart } }

    if (data.action === 'undo') {
      await prisma.goalContribution.deleteMany({ where: { goalId: goal.id, cycleStart } })
      return { saved: true }
    }
    const values = data.action === 'skip'
      ? { amountMinor: 0, skipped: true }
      : { amountMinor: toMinor(data.amount), skipped: false }
    await prisma.goalContribution.upsert({
      where: key,
      create: { goalId: goal.id, cycleStart, ...values },
      update: values,
    })
    return { saved: true }
  })

/* ------------------------------ Payday ------------------------------ */

export const setPayday = createServerFn({ method: 'POST' })
  .validator((data: { day: number | null }) => {
    if (data?.day === null) return { day: null }
    const day = Number(data?.day)
    if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Choose a day from 1 to 31.')
    return { day }
  })
  .handler(async ({ data }) => {
    const context = await requireHousehold()
    const prisma = await getDb()
    await prisma.budgetWorkspace.update({
      where: { id: context.workspaceId },
      data: { paydayDay: data.day },
    })
    return { saved: true }
  })
