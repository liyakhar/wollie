/**
 * The data the Home, Budgets, and Goals screens need, in a plain JSON shape.
 * Built on the server from the workspace, or from sample data for the demo.
 */

import type { BankSyncStatus, FinanceTransaction } from './finance-demo'
import {
  buildCyclePlan,
  suggestBudgets,
  toDateKey,
  type BudgetLimit,
  type CyclePlan,
  type Goal,
} from './money-cycle'
import { getPublicDemoFinanceDashboard } from './public-demo'

export type MoneyOverview = {
  currency: string
  hasAccounts: boolean
  syncStatus: BankSyncStatus
  cycle: {
    start: string
    end: string
    daysLeft: number
    paydayDay: number | null
    source: 'setting' | 'detected' | 'calendar'
  }
  paydaySetting: number | null
  spendingMoney: number
  safeToSpend: number
  perDay: number
  short: number
  shortReaches: CyclePlan['shortReaches']
  bills: CyclePlan['billsDue']
  billsTotal: number
  budgets: CyclePlan['budgets']
  budgetsLeft: number
  budgetsLimit: number
  goals: CyclePlan['goals']
  goalsDue: number
  goalsSaved: number
  /** Categories that can get a budget, with a suggested limit when known. */
  budgetOptions: Array<{ category: string; suggested: number }>
  reviewCount: number
}

/** Categories that are money movement, not spending. */
const NOT_BUDGETABLE = new Set(['income', 'transfer', 'savings'])

export function toMoneyOverview(input: {
  plan: CyclePlan
  currency: string
  hasAccounts: boolean
  syncStatus: BankSyncStatus
  paydaySetting: number | null
  transactions: FinanceTransaction[]
  categories: string[]
}): MoneyOverview {
  const { plan } = input
  const budgeted = new Set(plan.budgets.map((budget) => budget.category.toLocaleLowerCase()))
  const categories = input.categories.filter((category) => !NOT_BUDGETABLE.has(category.toLocaleLowerCase()))
  const suggested = new Map(
    suggestBudgets(input.transactions, plan.cycle, categories).map((item) => [item.category, item.limit]),
  )

  return {
    currency: input.currency,
    hasAccounts: input.hasAccounts,
    syncStatus: input.syncStatus,
    cycle: {
      start: toDateKey(plan.cycle.start),
      end: toDateKey(plan.cycle.end),
      daysLeft: plan.cycle.daysLeft,
      paydayDay: plan.cycle.paydayDay,
      source: plan.cycle.source,
    },
    paydaySetting: input.paydaySetting,
    spendingMoney: plan.spendingMoney,
    safeToSpend: plan.safeToSpend,
    perDay: plan.perDay,
    short: plan.short,
    shortReaches: plan.shortReaches,
    bills: plan.billsDue,
    billsTotal: plan.billsTotal,
    budgets: plan.budgets,
    budgetsLeft: plan.budgetsLeft,
    budgetsLimit: plan.budgetsLimit,
    goals: plan.goals,
    goalsDue: plan.goalsDue,
    goalsSaved: Math.round(plan.goals.reduce((sum, goal) => sum + goal.saved, 0) * 100) / 100,
    // Most-spent categories first; housing is usually a bill, so it goes last.
    budgetOptions: categories
      .filter((category) => !budgeted.has(category.toLocaleLowerCase()))
      .map((category) => ({ category, suggested: suggested.get(category) ?? 0 }))
      .sort((a, b) =>
        Number(a.category === 'Housing') - Number(b.category === 'Housing') ||
        b.suggested - a.suggested),
    reviewCount: input.transactions.filter((transaction) => transaction.status === 'needs-review').length,
  }
}

/* ------------------------------ Demo ------------------------------ */

const DEMO_BUDGETS: BudgetLimit[] = [
  { id: 'demo-groceries', category: 'Groceries', limit: 400 },
  { id: 'demo-dining', category: 'Dining', limit: 250 },
  { id: 'demo-transport', category: 'Transport', limit: 200 },
  { id: 'demo-shopping', category: 'Shopping', limit: 300 },
]

const DEMO_GOALS: Goal[] = [
  { id: 'demo-travel', name: 'Travel', icon: 'plane', target: 3000, monthly: 200, targetDate: '2027-06-30', saved: 1200, savedThisCycle: 0, skippedThisCycle: false },
  { id: 'demo-emergency', name: 'Emergency fund', icon: 'shield', target: 6000, monthly: 300, targetDate: null, saved: 4800, savedThisCycle: 300, skippedThisCycle: false },
  { id: 'demo-pension', name: 'Pension', icon: 'sprout', target: null, monthly: 150, targetDate: null, saved: 2640, savedThisCycle: 150, skippedThisCycle: false },
]

/** Sample overview for the public demo. Dates shift to today so it stays live. */
export function getDemoMoneyOverview(referenceDate = new Date()): MoneyOverview {
  const dashboard = getPublicDemoFinanceDashboard()
  const plan = buildCyclePlan({
    accounts: dashboard.accounts,
    transactions: dashboard.transactions,
    recurringPayments: dashboard.recurringPayments.map((payment) => ({ ...payment, confirmed: true })),
    budgets: DEMO_BUDGETS,
    goals: DEMO_GOALS,
    paydayDay: null,
    referenceDate,
  })
  return toMoneyOverview({
    plan,
    currency: dashboard.accounts[0]?.currency || 'EUR',
    hasAccounts: dashboard.accounts.length > 0,
    syncStatus: dashboard.syncStatus,
    paydaySetting: null,
    transactions: dashboard.transactions,
    categories: [...new Set(dashboard.transactions.map((transaction) => transaction.category))],
  })
}
