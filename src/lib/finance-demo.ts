import {
  applyBudgetRules,
  buildBudgetPlan,
  demoBudgetRules,
  type BudgetPlan,
  type BudgetRule,
} from './budget-engine'
import type { IncomeEnvelopePlan } from './income-allocation-engine'

export const FINANCE_CATEGORIES = [
  'Income',
  'Housing',
  'Groceries',
  'Transport',
  'Dining',
  'Subscriptions',
  'Shopping',
  'Savings',
  'Health',
  'Transfer',
] as const

export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number]
// Provider and household rules may add categories such as Tax. Keep the built-in
// union for autocomplete while allowing those persisted names through the finance flow.
export type TransactionCategoryName = FinanceCategory | (string & {})

export type FinanceTransaction = {
  id: string
  accountId?: string
  date: string
  merchant: string
  account: string
  category: TransactionCategoryName
  amount: number
  currency?: string
  status: 'cleared' | 'pending' | 'needs-review'
  recurring?: boolean
}

export type FinanceInsight = {
  id: string
  title: string
  body: string
}

export type BankSyncStatus = {
  mode: 'demo' | 'live-disabled' | 'live-connected'
  label: string
  description: string
  lastSynced: string
  canConnectLive: boolean
}

export type FinanceDashboardData = {
  month: string
  accounts: FinancialAccount[]
  transactions: FinanceTransaction[]
  budget: BudgetCategory[]
  budgetPlan: BudgetPlan
  rules: BudgetRule[]
  recurringPayments: RecurringPayment[]
  insights: FinanceInsight[]
  summary: ReturnType<typeof getDemoFinanceSummary>
  syncStatus: BankSyncStatus
  envelopeBudget?: IncomeEnvelopePlan
  household?: {
    currentMemberId: string
    members: Array<{
      id: string
      userId: string
      name: string
      email: string
      role: 'OWNER' | 'MEMBER'
      householdShareBasisPoints: number
    }>
  }
}

export type BudgetCategory = {
  name: string
  group?: 'Fixed' | 'Flexible' | 'Future'
  categoryNames?: string[]
  allocated: number
  spent: number
}

export type FinancialAccount = {
  id: string
  name: string
  type: 'Checking' | 'Credit card' | 'Savings'
  balance: number
  currency?: string
  institution: string
  lastSynced: string
  ownership?: Array<{ memberId: string; shareBasisPoints: number }>
  connectionStatus?: 'CONNECTED' | 'SYNCING' | 'NEEDS_RECONNECT' | 'FAILED' | 'DISABLED' | 'NOT_CONNECTED'
}

export type RecurringPayment = {
  id: string
  merchant: string
  amount: number
  cadence: 'monthly' | 'yearly'
  nextDate: string
  category: TransactionCategoryName
  currency?: string
  confirmed?: boolean
  source?: 'confirmed' | 'detected'
}

export const demoAccounts: FinancialAccount[] = [
  {
    id: 'checking',
    name: 'Everyday checking',
    type: 'Checking',
    balance: 3842.18,
    institution: 'SimpleFIN demo bank',
    lastSynced: 'Today, 8:42 AM',
  },
  {
    id: 'savings',
    name: 'House deposit',
    type: 'Savings',
    balance: 18440,
    institution: 'SimpleFIN demo bank',
    lastSynced: 'Today, 8:42 AM',
  },
  {
    id: 'card',
    name: 'Daily card',
    type: 'Credit card',
    balance: -1284.36,
    institution: 'SimpleFIN demo card',
    lastSynced: 'Today, 8:39 AM',
  },
]

export const demoTransactions: FinanceTransaction[] = [
  {
    id: 'txn-1',
    date: 'Jul 12',
    merchant: 'Whole Foods Market',
    account: 'Daily card',
    category: 'Groceries',
    amount: -86.42,
    status: 'cleared',
  },
  {
    id: 'txn-2',
    date: 'Jul 12',
    merchant: 'Figma',
    account: 'Daily card',
    category: 'Subscriptions',
    amount: -15,
    status: 'cleared',
    recurring: true,
  },
  {
    id: 'txn-3',
    date: 'Jul 11',
    merchant: 'Payroll',
    account: 'Everyday checking',
    category: 'Income',
    amount: 4200,
    status: 'cleared',
  },
  {
    id: 'txn-4',
    date: 'Jul 10',
    merchant: 'City transit',
    account: 'Daily card',
    category: 'Transport',
    amount: -32.5,
    status: 'cleared',
  },
  {
    id: 'txn-5',
    date: 'Jul 10',
    merchant: 'Unknown Apple charge',
    account: 'Daily card',
    category: 'Subscriptions',
    amount: -9.99,
    status: 'needs-review',
    recurring: true,
  },
  {
    id: 'txn-6',
    date: 'Jul 9',
    merchant: 'Rent',
    account: 'Everyday checking',
    category: 'Housing',
    amount: -1850,
    status: 'cleared',
    recurring: true,
  },
  {
    id: 'txn-7',
    date: 'Jul 8',
    merchant: 'Miznon',
    account: 'Daily card',
    category: 'Dining',
    amount: -44.1,
    status: 'cleared',
  },
]

export const demoBudget: BudgetCategory[] = [
  { name: 'Housing', allocated: 1900, spent: 1850 },
  { name: 'Groceries', allocated: 520, spent: 286 },
  { name: 'Dining', allocated: 260, spent: 188 },
  { name: 'Transport', allocated: 180, spent: 94 },
  { name: 'Subscriptions', allocated: 90, spent: 54 },
  { name: 'Shopping', allocated: 240, spent: 196 },
  { name: 'Savings', allocated: 900, spent: 900 },
]

export const demoRecurringPayments: RecurringPayment[] = [
  {
    id: 'rec-1',
    merchant: 'Rent',
    amount: 1850,
    cadence: 'monthly',
    nextDate: 'Aug 1',
    category: 'Housing',
  },
  {
    id: 'rec-2',
    merchant: 'Figma',
    amount: 15,
    cadence: 'monthly',
    nextDate: 'Aug 12',
    category: 'Subscriptions',
  },
  {
    id: 'rec-3',
    merchant: 'Spotify',
    amount: 11.99,
    cadence: 'monthly',
    nextDate: 'Jul 24',
    category: 'Subscriptions',
  },
]

export const demoInsights: FinanceInsight[] = [
  {
    id: 'insight-flex',
    title: 'Spending is on track',
    body: 'You have $436 left for flexible spending in July.',
  },
  {
    id: 'insight-dining',
    title: 'Dining moved up',
    body: 'Weekend meals are pacing higher than last month.',
  },
  {
    id: 'insight-review',
    title: 'One thing to review',
    body: 'An Apple charge may be a recurring subscription.',
  },
]

const DEMO_REFERENCE_DATE = new Date('2026-07-14T12:00:00.000Z')

export function formatMoney(amount: number, currency = 'USD') {
  const value = Math.abs(amount).toLocaleString('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })

  return amount < 0 ? `−${value}` : value
}

export function getDemoFinanceSummary() {
  return getFinanceSummary({
    accounts: demoAccounts,
    transactions: demoTransactions,
    budget: demoBudget,
    recurringPayments: demoRecurringPayments,
    referenceDate: DEMO_REFERENCE_DATE,
  })
}

export function getFinanceSummary({
  accounts,
  transactions,
  budget = demoBudget,
  recurringPayments = demoRecurringPayments,
  rules = demoBudgetRules,
  referenceDate = new Date(),
}: {
  accounts: FinancialAccount[]
  transactions: FinanceTransaction[]
  budget?: BudgetCategory[]
  recurringPayments?: RecurringPayment[]
  rules?: BudgetRule[]
  referenceDate?: Date
}) {
  const cash = accounts
    .filter((account) => account.type !== 'Credit card')
    .reduce((sum, account) => sum + account.balance, 0)
  const liquidCash = accounts
    .filter((account) => account.type === 'Checking')
    .reduce((sum, account) => sum + account.balance, 0)
  const creditCardDebt = accounts
    .filter((account) => account.type === 'Credit card')
    .reduce((sum, account) => sum + Math.max(Math.abs(Math.min(account.balance, 0)), 0), 0)
  const normalizedTransactions = applyBudgetRules(transactions, rules)
  const monthlyTransactions = filterTransactionsForMonth(normalizedTransactions, referenceDate)
  const spendingTransactions = monthlyTransactions.filter(
    (transaction) => !isTransferTransaction(transaction),
  )
  const budgetPlan = buildBudgetPlan({
    budget,
    transactions: spendingTransactions,
    recurringPayments,
  })
  const monthlyIncome = spendingTransactions
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  const futureCategories = new Set(
    budget
      .filter((category) => category.group === 'Future' || category.name === 'Savings')
      .flatMap((category) => category.categoryNames?.length ? category.categoryNames : [category.name])
      .map((category) => category.toLocaleLowerCase()),
  )
  const saved = spendingTransactions
    .filter((transaction) => transaction.amount < 0 && futureCategories.has(transaction.category.toLocaleLowerCase()))
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
  const spent = spendingTransactions
    .filter((transaction) => transaction.amount < 0 && !futureCategories.has(transaction.category.toLocaleLowerCase()))
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
  const upcomingRecurring = recurringPayments
    .filter((payment) => payment.confirmed !== false)
    .filter((payment) => isUpcomingThisMonth(payment.nextDate, referenceDate))
    .reduce((sum, payment) => sum + Math.abs(payment.amount), 0)
  const cashAfterCommitments = Math.max(
    liquidCash - creditCardDebt - upcomingRecurring,
    0,
  )
  const safeToSpend = budgetPlan.groups.length > 0
    ? Math.min(cashAfterCommitments, budgetPlan.flexibleAvailable)
    : cashAfterCommitments

  return {
    budgetPlan,
    cash,
    liquidCash,
    creditCardDebt,
    monthlyIncome,
    spent,
    saved,
    upcomingRecurring,
    allocated: budgetPlan.allocated,
    spentAgainstBudget: budgetPlan.spent,
    safeToSpend,
    cashAfterCommitments,
    reviewCount: budgetPlan.reviewCount,
    recurringTotal: budgetPlan.recurringTotal,
    overCount: budgetPlan.overCount,
  }
}

export function filterTransactionsForMonth(
  transactions: FinanceTransaction[],
  referenceDate = new Date(),
) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()

  return transactions.filter((transaction) => {
    const date = parseFinanceDate(transaction.date, referenceDate)
    return date?.getFullYear() === year && date.getMonth() === month
  })
}

export function isTransferTransaction(transaction: FinanceTransaction) {
  if (transaction.category === 'Transfer') return true
  const text = transaction.merchant.toLowerCase()
  return /\b(transfer|card payment|credit card payment|payment thank you|internal transfer)\b/.test(text)
}

export function detectRecurringPayments(
  transactions: FinanceTransaction[],
  referenceDate = new Date(),
): RecurringPayment[] {
  const groups = new Map<string, FinanceTransaction[]>()

  for (const transaction of transactions) {
    // Moving money to your own savings is saving, not a bill.
    if (transaction.amount >= 0 || isTransferTransaction(transaction) || transaction.category === 'Savings') continue
    const key = transaction.merchant.trim().toLowerCase().replace(/\s+/g, ' ')
    const group = groups.get(key) ?? []
    group.push(transaction)
    groups.set(key, group)
  }

  const recurring: RecurringPayment[] = []

  for (const [key, group] of groups) {
    if (group.length < 2) continue
    const dated = group
      .map((transaction) => ({ transaction, date: parseFinanceDate(transaction.date, referenceDate) }))
      .filter((item): item is { transaction: FinanceTransaction; date: Date } => Boolean(item.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    if (dated.length < 2) continue

    const gaps = dated.slice(1).map((item, index) =>
      Math.round((item.date.getTime() - dated[index]!.date.getTime()) / 86_400_000),
    )
    const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
    const cadence = averageGap >= 330 && averageGap <= 400
      ? 'yearly'
      : averageGap >= 20 && averageGap <= 45
        ? 'monthly'
        : null
    if (!cadence) continue

    const amounts = dated.map((item) => Math.abs(item.transaction.amount))
    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    const tolerance = Math.max(2, averageAmount * 0.15)
    if (amounts.some((amount) => Math.abs(amount - averageAmount) > tolerance)) continue

    const last = dated.at(-1)!
    const nextDate = new Date(last.date)
    if (cadence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1)
    else nextDate.setFullYear(nextDate.getFullYear() + 1)

    recurring.push({
      id: `detected-${key.replace(/[^a-z0-9]+/g, '-')}`,
      merchant: last.transaction.merchant,
      amount: Math.round(averageAmount * 100) / 100,
      cadence,
      nextDate: nextDate.toISOString().slice(0, 10),
      category: last.transaction.category,
      currency: last.transaction.currency || 'USD',
      confirmed: false,
      source: 'detected',
    })
  }

  return recurring.sort((a, b) => a.nextDate.localeCompare(b.nextDate))
}

function parseFinanceDate(value: string, referenceDate: Date) {
  if (!value || value === 'Pending') return null
  const hasYear = /\d{4}/.test(value)
  const parsed = new Date(hasYear ? value : `${value}, ${referenceDate.getFullYear()}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isUpcomingThisMonth(value: string, referenceDate: Date) {
  const date = parseFinanceDate(value, referenceDate)
  return Boolean(
    date &&
      date >= startOfDay(referenceDate) &&
      date.getFullYear() === referenceDate.getFullYear() &&
      date.getMonth() === referenceDate.getMonth(),
  )
}

function startOfDay(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export const demoSyncStatus: BankSyncStatus = {
  mode: 'demo',
  label: 'Demo sync',
  description: 'Sample bank data is loaded. Live bank sync can plug in next.',
  lastSynced: 'Today, 8:42 AM',
  canConnectLive: false,
}

export function getDemoFinanceDashboard(): FinanceDashboardData {
  const transactions = applyBudgetRules(demoTransactions)
  const budgetPlan = buildBudgetPlan({
    budget: demoBudget,
    transactions,
    recurringPayments: demoRecurringPayments,
  })

  return {
    month: 'July',
    accounts: demoAccounts,
    transactions,
    budget: demoBudget,
    budgetPlan,
    rules: demoBudgetRules,
    recurringPayments: demoRecurringPayments,
    insights: demoInsights,
    summary: getDemoFinanceSummary(),
    syncStatus: demoSyncStatus,
  }
}

export function filterDemoTransactions(options: {
  q?: string
  status?: FinanceTransaction['status'] | 'all'
  category?: FinanceCategory | 'all'
}) {
  return filterFinanceTransactions(applyBudgetRules(demoTransactions), options)
}

export function filterFinanceTransactions(
  transactions: FinanceTransaction[],
  options: {
    q?: string
    status?: FinanceTransaction['status'] | 'all'
    category?: TransactionCategoryName | 'all'
  },
) {
  const q = options.q?.trim().toLowerCase()

  return transactions.filter((transaction) => {
    const matchesQuery = q
      ? [transaction.merchant, transaction.account, transaction.category]
          .join(' ')
          .toLowerCase()
          .includes(q)
      : true
    const matchesStatus =
      !options.status || options.status === 'all' || transaction.status === options.status
    const matchesCategory =
      !options.category || options.category === 'all' || transaction.category === options.category

    return matchesQuery && matchesStatus && matchesCategory
  })
}
