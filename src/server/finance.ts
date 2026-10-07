import { devLoginEnabled } from '#/server/dev-login'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import {
  detectRecurringPayments,
  FINANCE_CATEGORIES,
  filterFinanceTransactions,
  filterTransactionsForMonth,
  getDemoFinanceDashboard,
  getFinanceSummary,
  type BudgetCategory,
  type FinanceCategory,
  type FinanceDashboardData,
  type FinanceTransaction,
  type RecurringPayment,
  type TransactionCategoryName,
} from '#/lib/finance-demo'
import { loadBankSyncState } from '#/server/bank-sync'
import { getDb } from '#/server/db-access.server'
import {
  budgetCategoriesForIncomeEnvelope,
  categoryOptionsFor,
  loadIncomeEnvelopePlan,
  parseIncomeEnvelopePlanInput,
  saveIncomeEnvelopePlan,
  type IncomeEnvelopePlanFormInput,
} from '#/server/income-envelope-budget.server'
import { getSessionUser } from '#/server/session.server'
import { requireFinanceHousehold } from '#/server/household-access.server'
import { assertWithinPlanLimit } from '#/lib/billing-plans'
import { loadBillingAccess } from '#/server/billing.server'

export const getFinanceDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const context = await requirePrivateFinanceHousehold()
  const household = await loadHouseholdMetadata(context.workspaceId, context.memberId)
  const devDashboard = await getDevFinanceDashboard(context.workspaceId)
  if (devDashboard) return attachDevHousehold(devDashboard, household)

  const syncState = await loadBankSyncState()

  const planning = await loadFinancePlanningData(syncState.transactions, context.workspaceId)
  const recurringPayments = planning.recurringPayments
  const transactions = markRecurringTransactions(syncState.transactions, recurringPayments)
  const summary = getFinanceSummary({
    accounts: syncState.accounts,
    transactions,
    budget: planning.budget,
    recurringPayments,
    rules: planning.rules,
  })
  const demoDashboard = getDemoFinanceDashboard()

  return {
    ...demoDashboard,
    month: getCurrentMonthName(),
    syncStatus: syncState.status,
    accounts: syncState.accounts,
    transactions,
    budget: planning.budget,
    budgetPlan: summary.budgetPlan,
    recurringPayments,
    insights: buildStatusNotes(summary.reviewCount, syncState.accounts.length),
    summary,
    household,
    envelopeBudget: planning.envelopeBudget,
  } satisfies FinanceDashboardData
})

export const getFinanceTransactions = createServerFn({ method: 'GET' })
  .validator(
    (data: {
      q?: string
      status?: FinanceTransaction['status'] | 'all'
      category?: TransactionCategoryName | 'all'
    }) => data ?? {},
  )
  .handler(async ({ data }) => {
    const context = await requirePrivateFinanceHousehold()
    const devDashboard = await getDevFinanceDashboard(context.workspaceId)
    if (devDashboard) {
      return {
        transactions: filterFinanceTransactions(devDashboard.transactions, data),
        canAddManual: true,
        categoryOptions: devDashboard.envelopeBudget?.categoryOptions ?? categoryOptionsFor([]),
        envelopeBudget: devDashboard.envelopeBudget,
      }
    }

    const syncState = await loadBankSyncState()
    const recurringPayments = detectRecurringPayments(syncState.transactions)
    const transactions = markRecurringTransactions(syncState.transactions, recurringPayments)
    const envelopeBudget = await loadIncomeEnvelopePlan({
      workspaceId: context.workspaceId,
      transactions,
    })

    return {
      transactions: filterFinanceTransactions(transactions, data),
      canAddManual: false,
      categoryOptions: envelopeBudget.categoryOptions,
      envelopeBudget,
    }
  })

export const getFinanceBudget = createServerFn({ method: 'GET' }).handler(async () => {
  const context = await requirePrivateFinanceHousehold()
  const devDashboard = await getDevFinanceDashboard(context.workspaceId)
  if (devDashboard) {
    return {
      month: devDashboard.month,
      budget: devDashboard.budget,
      budgetPlan: devDashboard.budgetPlan,
      summary: devDashboard.summary,
      syncStatus: devDashboard.syncStatus,
      currency: devDashboard.envelopeBudget?.currency || devDashboard.accounts[0]?.currency || 'EUR',
      envelopeBudget: devDashboard.envelopeBudget,
      canChangeCurrency: context.role === 'OWNER',
      availableCurrencies: availableCurrenciesFor(
        devDashboard.envelopeBudget?.currency || devDashboard.accounts[0]?.currency || 'EUR',
        devDashboard.accounts,
      ),
    }
  }

  const syncState = await loadBankSyncState()
  const planning = await loadFinancePlanningData(syncState.transactions, context.workspaceId)
  const recurringPayments = planning.recurringPayments
  const transactions = markRecurringTransactions(syncState.transactions, recurringPayments)
  const summary = getFinanceSummary({
    accounts: syncState.accounts,
    transactions,
    budget: planning.budget,
    recurringPayments,
    rules: planning.rules,
  })

  return {
    month: getCurrentMonthName(),
    budget: planning.budget,
    budgetPlan: summary.budgetPlan,
    summary,
    syncStatus: syncState.status,
    currency: planning.currency,
    envelopeBudget: planning.envelopeBudget,
    canChangeCurrency: context.role === 'OWNER',
    availableCurrencies: availableCurrenciesFor(planning.currency, syncState.accounts),
  }
})

export const getFinanceAccounts = createServerFn({ method: 'GET' }).handler(async () => {
  const context = await requirePrivateFinanceHousehold()
  const household = await loadHouseholdMetadata(context.workspaceId, context.memberId)
  const devDashboard = await getDevFinanceDashboard(context.workspaceId)
  if (devDashboard) {
    return {
      accounts: attachDevHousehold(devDashboard, household).accounts,
      syncStatus: devDashboard.syncStatus,
      household,
    }
  }

  const syncState = await loadBankSyncState()
  return {
    accounts: syncState.accounts,
    syncStatus: syncState.status,
    household,
  }
})

export const getFinanceRecurringPayments = createServerFn({ method: 'GET' }).handler(async () => {
  const context = await requirePrivateFinanceHousehold()
  const devDashboard = await getDevFinanceDashboard(context.workspaceId)
  if (devDashboard) {
    return {
      recurringPayments: devDashboard.recurringPayments,
      currency: devDashboard.envelopeBudget?.currency || devDashboard.accounts[0]?.currency || 'EUR',
      categoryOptions: devDashboard.envelopeBudget?.categoryOptions ?? categoryOptionsFor([]),
    }
  }

  const syncState = await loadBankSyncState()
  const planning = await loadFinancePlanningData(syncState.transactions, context.workspaceId)
  return {
    recurringPayments: planning.recurringPayments,
    currency: planning.currency || syncState.accounts[0]?.currency || 'EUR',
    categoryOptions: planning.envelopeBudget?.categoryOptions ?? categoryOptionsFor([]),
  }
})

export const getFinanceInsights = createServerFn({ method: 'GET' }).handler(async () => {
  const context = await requirePrivateFinanceHousehold()
  const devDashboard = await getDevFinanceDashboard(context.workspaceId)
  if (devDashboard) return { insights: devDashboard.insights }

  const syncState = await loadBankSyncState()
  const planning = await loadFinancePlanningData(syncState.transactions, context.workspaceId)
  const recurringPayments = planning.recurringPayments
  const transactions = markRecurringTransactions(syncState.transactions, recurringPayments)
  const summary = getFinanceSummary({
    accounts: syncState.accounts,
    transactions,
    budget: planning.budget,
    recurringPayments,
    rules: planning.rules,
  })

  return {
    insights: buildStatusNotes(summary.reviewCount, syncState.accounts.length),
  }
})

export const updateFinanceBudgetAllocation = createServerFn({ method: 'POST' })
  .validator((data: { category: FinanceCategory; allocated: number }) => ({
    category: data?.category,
    allocated: Number(data?.allocated ?? 0),
  }))
  .handler(async ({ data }) => {
    const context = await requirePrivateFinanceHousehold()
    const user = context.user
    if (!FINANCE_CATEGORIES.includes(data.category) || !Number.isFinite(data.allocated) || data.allocated < 0) {
      throw new Error('Enter a valid monthly amount.')
    }

    if (isDevUser(user.email)) {
      const current = getMutableDevDashboard()
      const existing = current.budget.find((item) => item.name === data.category)
      current.budget = existing
        ? current.budget.map((item) => item.name === data.category ? { ...item, allocated: data.allocated } : item)
        : [...current.budget, { name: data.category, allocated: data.allocated, spent: 0 }]
      return { saved: true }
    }

    const prisma = await getDb()
    const workspace = { id: context.workspaceId }
    const category = await prisma.transactionCategory.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: data.category } },
      create: { workspaceId: workspace.id, name: data.category, system: true },
      update: {},
    })
    const month = await prisma.budgetMonth.upsert({
      where: { workspaceId_month: { workspaceId: workspace.id, month: getCurrentMonthKey() } },
      create: { workspaceId: workspace.id, month: getCurrentMonthKey() },
      update: {},
    })
    await prisma.budgetAllocation.upsert({
      where: { budgetMonthId_categoryId: { budgetMonthId: month.id, categoryId: category.id } },
      create: { budgetMonthId: month.id, categoryId: category.id, allocatedMinor: Math.round(data.allocated * 100) },
      update: { allocatedMinor: Math.round(data.allocated * 100) },
    })
    return { saved: true }
  })

export const saveFinanceEnvelopeBudget = createServerFn({ method: 'POST' })
  .validator((data: IncomeEnvelopePlanFormInput) => parseIncomeEnvelopePlanInput(data))
  .handler(async ({ data }) => {
    const context = await requirePrivateFinanceHousehold()
    const billing = await loadBillingAccess(context.ownerUserId)
    assertWithinPlanLimit(
      data.buckets.length,
      billing.limits.budgetEnvelopes,
      'money-plan envelopes',
    )
    return saveIncomeEnvelopePlan({
      workspaceId: context.workspaceId,
      role: context.role,
      plan: data,
    })
  })

export const updateFinanceRecurringPayment = createServerFn({ method: 'POST' })
  .validator((data: {
    id?: string
    action: 'confirm' | 'save' | 'dismiss'
    merchant: string
    amount: number
    nextDate: string
    cadence: 'monthly' | 'yearly'
    category: TransactionCategoryName
  }) => ({
    id: String(data?.id ?? ''),
    action: data?.action,
    merchant: String(data?.merchant ?? '').trim(),
    amount: Number(data?.amount ?? 0),
    nextDate: String(data?.nextDate ?? ''),
    cadence: data?.cadence,
    category: String(data?.category ?? '').trim().replace(/\s+/g, ' '),
  }))
  .handler(async ({ data }) => {
    const context = await requirePrivateFinanceHousehold()
    const user = context.user
    if (
      !data.merchant
      || !Number.isFinite(data.amount)
      || data.amount < 0
      || !data.nextDate
      || !data.category
      || data.category.length > 48
      || data.category === 'Income'
      || data.category === 'Transfer'
    ) {
      throw new Error('Enter a valid merchant, amount, category, and next date.')
    }

    if (isDevUser(user.email)) {
      const current = getMutableDevDashboard()
      const next: RecurringPayment = {
        id: data.id || `dev-rec-${slugify(data.merchant)}`,
        merchant: data.merchant,
        amount: data.amount,
        nextDate: data.nextDate,
        cadence: data.cadence,
        category: data.category,
        currency: current.accounts[0]?.currency || 'EUR',
        confirmed: data.action !== 'dismiss',
        source: 'confirmed',
      }
      current.recurringPayments = [
        ...current.recurringPayments.filter((item) => normalizeMerchant(item.merchant) !== normalizeMerchant(data.merchant) && item.id !== data.id),
        ...(data.action === 'dismiss' ? [] : [next]),
      ]
      return { saved: true }
    }

    const prisma = await getDb()
    const workspace = await prisma.budgetWorkspace.findUniqueOrThrow({ where: { id: context.workspaceId } })
    const category = await prisma.transactionCategory.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: data.category } },
      create: {
        workspaceId: workspace.id,
        name: data.category,
        system: FINANCE_CATEGORIES.includes(data.category as FinanceCategory),
      },
      update: {},
    })
    const merchant = await prisma.merchant.upsert({
      where: { workspaceId_normalizedName: { workspaceId: workspace.id, normalizedName: normalizeMerchant(data.merchant) } },
      create: { workspaceId: workspace.id, name: data.merchant, normalizedName: normalizeMerchant(data.merchant) },
      update: { name: data.merchant },
    })
    const existing = data.id && !data.id.startsWith('detected-')
      ? await prisma.recurringPayment.findFirst({ where: { id: data.id, workspaceId: workspace.id } })
      : await prisma.recurringPayment.findFirst({ where: { workspaceId: workspace.id, merchantId: merchant.id } })
    const values = {
      workspaceId: workspace.id,
      merchantId: merchant.id,
      categoryId: category.id,
      name: data.merchant,
      amountMinor: Math.round(data.amount * 100),
      currency: workspace.currency,
      cadence: data.cadence === 'yearly' ? 'YEARLY' as const : 'MONTHLY' as const,
      nextDate: new Date(`${data.nextDate}T12:00:00`),
      confirmed: data.action !== 'dismiss',
    }
    if (existing) await prisma.recurringPayment.update({ where: { id: existing.id }, data: values })
    else await prisma.recurringPayment.create({ data: values })
    return { saved: true }
  })

export const updateFinanceTransactionCategory = createServerFn({ method: 'POST' })
  .validator((data: { transactionId: string; category: string }) => ({
    transactionId: String(data?.transactionId ?? ''),
    category: String(data?.category ?? '').trim().replace(/\s+/g, ' '),
  }))
  .handler(async ({ data }) => {
    const context = await requirePrivateFinanceHousehold()
    const user = context.user
    if (!data.transactionId || !data.category || data.category.length > 48) {
      throw new Error('Choose a valid category.')
    }

    if (isDevUser(user.email)) {
      const current = getMutableDevDashboard()
      current.transactions = current.transactions.map((transaction) => transaction.id === data.transactionId
        ? { ...transaction, category: data.category, status: 'cleared' }
        : transaction)
      return { updated: 1 }
    }

    const prisma = await getDb()
    const transaction = await prisma.financeTransaction.findFirst({
      where: {
        id: data.transactionId,
        workspaceId: context.workspaceId,
      },
      include: { merchant: true },
    })
    if (!transaction) throw new Error('Transaction not found.')

    const category = await prisma.transactionCategory.upsert({
      where: {
        workspaceId_name: {
          workspaceId: transaction.workspaceId,
          name: data.category,
        },
      },
      create: {
        workspaceId: transaction.workspaceId,
        name: data.category,
        system: FINANCE_CATEGORIES.includes(data.category as FinanceCategory),
      },
      update: {},
    })

    if (!transaction.merchantId) {
      await prisma.financeTransaction.update({
        where: { id: transaction.id },
        data: { categoryId: category.id, status: 'CLEARED' },
      })
      return { updated: 1 }
    }

    const existingRule = await prisma.categoryRule.findFirst({
      where: {
        workspaceId: transaction.workspaceId,
        merchantId: transaction.merchantId,
      },
    })

    const [, updated] = await prisma.$transaction([
      existingRule
        ? prisma.categoryRule.update({
            where: { id: existingRule.id },
            data: { categoryId: category.id },
          })
        : prisma.categoryRule.create({
            data: {
              workspaceId: transaction.workspaceId,
              merchantId: transaction.merchantId,
              categoryId: category.id,
            },
          }),
      prisma.financeTransaction.updateMany({
        where: {
          workspaceId: transaction.workspaceId,
          merchantId: transaction.merchantId,
        },
        data: { categoryId: category.id, status: 'CLEARED' },
      }),
    ])

    return { updated: updated.count }
  })

export const createFinanceTransactionCategory = createServerFn({ method: 'POST' })
  .validator((data: { name: string }) => ({
    name: String(data?.name ?? '').trim().replace(/\s+/g, ' '),
  }))
  .handler(async ({ data }) => {
    const context = await requirePrivateFinanceHousehold()
    const reservedNames = new Set(['income', 'transfer'])
    if (!data.name || data.name.length > 48 || reservedNames.has(data.name.toLocaleLowerCase())) {
      throw new Error('Enter a category name other than Income or Transfer.')
    }

    const prisma = await getDb()
    const existing = await prisma.transactionCategory.findFirst({
      where: {
        workspaceId: context.workspaceId,
        name: { equals: data.name, mode: 'insensitive' },
      },
      select: { name: true },
    })
    if (existing) return { category: existing.name, created: false }

    const category = await prisma.transactionCategory.create({
      data: {
        workspaceId: context.workspaceId,
        name: data.name,
        system: false,
      },
      select: { name: true },
    })
    return { category: category.name, created: true }
  })

export const addDevFinanceTransaction = createServerFn({ method: 'POST' })
  .validator((data: {
    merchant: string
    amount: number
    category: TransactionCategoryName
    date?: string
  }) => ({
    merchant: String(data?.merchant ?? '').trim(),
    amount: Number(data?.amount ?? 0),
    category: String(data?.category ?? '').trim().replace(/\s+/g, ' '),
    date: String(data?.date ?? ''),
  }))
  .handler(async ({ data }) => {
    const context = await requirePrivateFinanceHousehold()
    const user = context.user
    if (!isDevUser(user.email)) {
      throw new Error('Manual dev spending is only available for the local demo user.')
    }
    if (
      !data.merchant
      || !Number.isFinite(data.amount)
      || data.amount <= 0
      || !data.category
      || data.category.length > 48
      || data.category === 'Income'
      || data.category === 'Transfer'
    ) {
      throw new Error('Enter a merchant, amount, and category.')
    }

    const current = getMutableDevDashboard()
    const account = current.accounts.find((item) => item.type === 'Credit card') ?? current.accounts[0]
    const postedAt = data.date
      ? new Date(`${data.date}T12:00:00`)
      : new Date()
    const transaction: FinanceTransaction = {
      id: `dev-manual-${Date.now()}`,
      accountId: account?.id,
      date: Number.isNaN(postedAt.getTime()) ? new Date().toISOString() : postedAt.toISOString(),
      merchant: data.merchant,
      account: account?.name || 'Manual spending',
      category: data.category,
      amount: -Math.abs(data.amount),
      currency: account?.currency || current.accounts[0]?.currency || 'EUR',
      status: 'cleared',
    }
    current.transactions = [transaction, ...current.transactions]
    return { transaction }
  })

function getCurrentMonthName() {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date())
}

function getCurrentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

type MutableDevDashboard = FinanceDashboardData & {
  budget: BudgetCategory[]
  recurringPayments: RecurringPayment[]
  transactions: FinanceTransaction[]
}

let mutableDevDashboard: MutableDevDashboard | null = null

function getMutableDevDashboard() {
  if (!mutableDevDashboard) {
    const base = getDemoFinanceDashboard()
    mutableDevDashboard = {
      ...base,
      budget: base.budget.map((item) => ({ ...item })),
      recurringPayments: base.recurringPayments.map((item) => ({ ...item, confirmed: true, source: 'confirmed' })),
      transactions: base.transactions.map((item) => ({ ...item })),
    }
  }
  return mutableDevDashboard
}

async function buildMutableDevDashboard(workspaceId: string) {
  const current = getMutableDevDashboard()
  const persistedPlan = await loadIncomeEnvelopePlan({
    workspaceId,
    transactions: current.transactions,
  })
  const budget = persistedPlan.enabled
    ? budgetCategoriesForIncomeEnvelope(persistedPlan)
    : applyCurrentSpendingToBudget(current.budget, current.transactions)
  const summary = getFinanceSummary({
    accounts: current.accounts,
    transactions: current.transactions,
    budget,
    recurringPayments: current.recurringPayments,
    rules: current.rules,
  })
  return {
    ...current,
    month: getCurrentMonthName(),
    budget,
    budgetPlan: summary.budgetPlan,
    summary,
    envelopeBudget: persistedPlan,
  } satisfies FinanceDashboardData
}

function applyCurrentSpendingToBudget(
  budget: BudgetCategory[],
  transactions: FinanceTransaction[],
) {
  const currentTransactions = filterTransactionsForMonth(transactions)
  const spendingByCategory = new Map<string, number>()
  for (const transaction of currentTransactions) {
    if (transaction.amount >= 0 || transaction.category === 'Transfer') continue
    spendingByCategory.set(
      transaction.category,
      (spendingByCategory.get(transaction.category) ?? 0) + Math.abs(transaction.amount),
    )
  }

  return budget.map((item) => ({
    ...item,
    spent: spendingByCategory.get(item.name) ?? 0,
  }))
}

async function getDevFinanceDashboard(workspaceId: string) {
  if (process.env.NODE_ENV !== 'development') return null

  const user = await getSessionUser()
  if (!user || !isDevUser(user.email)) return null

  // The developer login starts with useful sample data, but it must stop
  // masking real provider data as soon as an account has been connected.
  const prisma = await getDb()
  const connectedAccounts = await prisma.financialAccount.count({
    where: {
      workspaceId,
      bankConnection: { status: 'CONNECTED' },
    },
  })
  if (connectedAccounts > 0) return null

  return buildMutableDevDashboard(workspaceId)
}

function isDevUser(email?: string | null) {
  return devLoginEnabled() && email === 'dev@wollie.local'
}

async function loadFinancePlanningData(transactions: FinanceTransaction[], workspaceId: string) {
  const prisma = await getDb()
  const workspace = await prisma.budgetWorkspace.findFirst({
    where: { id: workspaceId, demo: false },
    include: {
      budgetMonths: {
        where: { month: getCurrentMonthKey() },
        include: { allocations: { include: { category: true } } },
      },
      recurringPayments: { include: { category: true, merchant: true }, orderBy: { nextDate: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  })
  if (!workspace) {
    return {
      budget: [] as BudgetCategory[],
      recurringPayments: detectRecurringPayments(transactions),
      rules: [],
      currency: transactions.find((transaction) => transaction.currency)?.currency || 'EUR',
      envelopeBudget: undefined,
    }
  }

  const currentTransactions = filterTransactionsForMonth(transactions)
  const spendingByCategory = new Map<string, number>()
  for (const transaction of currentTransactions) {
    if (transaction.amount >= 0 || transaction.category === 'Transfer') continue
    spendingByCategory.set(
      transaction.category,
      (spendingByCategory.get(transaction.category) ?? 0) + Math.abs(transaction.amount),
    )
  }
  const legacyBudget = (workspace.budgetMonths[0]?.allocations ?? []).flatMap((allocation) => {
    const name = allocation.category.name as FinanceCategory
    if (!FINANCE_CATEGORIES.includes(name)) return []
    return [{ name, allocated: allocation.allocatedMinor / 100, spent: spendingByCategory.get(name) ?? 0 }]
  })
  const envelopeBudget = await loadIncomeEnvelopePlan({ workspaceId: workspace.id, transactions })
  const budget = envelopeBudget.enabled
    ? budgetCategoriesForIncomeEnvelope(envelopeBudget)
    : legacyBudget
  const saved = workspace.recurringPayments.map((payment) => ({
    id: payment.id,
    merchant: payment.merchant?.name || payment.name,
    amount: Math.abs(payment.amountMinor / 100),
    cadence: payment.cadence === 'YEARLY' ? 'yearly' as const : 'monthly' as const,
    nextDate: payment.nextDate.toISOString().slice(0, 10),
    category: FINANCE_CATEGORIES.includes(payment.category?.name as FinanceCategory)
      ? payment.category!.name as FinanceCategory
      : 'Subscriptions' as const,
    currency: payment.currency,
    confirmed: payment.confirmed,
    source: 'confirmed' as const,
  }))
  const suppressed = new Set(saved.filter((item) => !item.confirmed).map((item) => normalizeMerchant(item.merchant)))
  const confirmed = saved.filter((item) => item.confirmed)
  const confirmedNames = new Set(confirmed.map((item) => normalizeMerchant(item.merchant)))
  const detected = detectRecurringPayments(transactions).filter((item) => {
    const merchant = normalizeMerchant(item.merchant)
    return !confirmedNames.has(merchant) && !suppressed.has(merchant)
  })

  return {
    budget,
    recurringPayments: [...confirmed, ...detected],
    rules: [],
    currency: workspace.currency,
    envelopeBudget,
  }
}

/**
 * Accounts, transactions, and bills for one workspace, from the dev sample
 * or the live bank data. Used by the budgets and goals model (money.ts).
 */
export const loadMoneySnapshot = createServerOnlyFn(async (workspaceId: string) => {
  const devDashboard = await getDevFinanceDashboard(workspaceId)
  if (devDashboard) {
    return {
      accounts: devDashboard.accounts,
      transactions: devDashboard.transactions,
      recurringPayments: devDashboard.recurringPayments,
      currency: devDashboard.envelopeBudget?.currency || devDashboard.accounts[0]?.currency || 'EUR',
      syncStatus: devDashboard.syncStatus,
    }
  }

  const syncState = await loadBankSyncState()
  const planning = await loadFinancePlanningData(syncState.transactions, workspaceId)
  return {
    accounts: syncState.accounts,
    transactions: markRecurringTransactions(syncState.transactions, planning.recurringPayments),
    recurringPayments: planning.recurringPayments,
    currency: planning.currency,
    syncStatus: syncState.status,
  }
})

async function requirePrivateFinanceHousehold() {
  const context = await requireFinanceHousehold()
  setResponseHeader('Cache-Control', 'private, no-store, max-age=0')
  return context
}

function availableCurrenciesFor(
  currency: string,
  accounts: Array<{ currency?: string }>,
) {
  return Array.from(new Set([
    currency,
    ...accounts.map((account) => account.currency).filter((value): value is string => Boolean(value)),
    'EUR',
    'USD',
    'GBP',
  ]))
}

async function loadHouseholdMetadata(workspaceId: string, currentMemberId: string) {
  const prisma = await getDb()
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return {
    currentMemberId,
    members: members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name || member.user.email.split('@')[0],
      email: member.user.email,
      role: member.role,
      householdShareBasisPoints: member.householdShareBasisPoints,
    })),
  }
}

function attachDevHousehold(
  dashboard: FinanceDashboardData,
  household: NonNullable<FinanceDashboardData['household']>,
): FinanceDashboardData {
  return {
    ...dashboard,
    household,
    accounts: dashboard.accounts.map((account) => ({
      ...account,
      ownership: [{ memberId: household.currentMemberId, shareBasisPoints: 10_000 }],
      connectionStatus: 'CONNECTED',
    })),
  }
}

function normalizeMerchant(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function slugify(value: string) {
  return normalizeMerchant(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function markRecurringTransactions(
  transactions: FinanceTransaction[],
  recurringPayments: RecurringPayment[],
) {
  const recurringMerchants = new Set(
    recurringPayments.map((payment) => payment.merchant.trim().toLowerCase()),
  )
  return transactions.map((transaction) => ({
    ...transaction,
    recurring: recurringMerchants.has(transaction.merchant.trim().toLowerCase()),
  }))
}

function buildStatusNotes(reviewCount: number, accountCount: number) {
  if (accountCount === 0) {
    return [
      {
        id: 'connect-account',
        title: 'No bank connected',
        body: 'Connect an account before Wollie can show balances, spending, and review items.',
      },
    ]
  }

  if (reviewCount > 0) {
    return [
      {
        id: 'review-transactions',
        title: `${reviewCount} item${reviewCount === 1 ? '' : 's'} need review`,
        body: 'Review uncategorized or unusual transactions before trusting the plan.',
      },
    ]
  }

  return [
    {
      id: 'no-review',
      title: 'Nothing needs review',
      body: 'Connected transactions are categorized and ready for the plan.',
    },
  ]
}
