/**
 * Wollie money model (2026-09-24).
 *
 * Rules, in plain words:
 * 1. Plan only with money you already have. Future salary never counts.
 * 2. A cycle runs from payday to the day before the next payday. With no
 *    payday known, the cycle is the calendar month.
 * 3. A budget is a spending limit for the cycle. "Left" is limit minus spent.
 * 4. A goal is a monthly amount you move to savings yourself. Wollie tracks
 *    whether this cycle's amount is saved.
 * 5. Safe to spend = spending money now − bills due before payday − goal
 *    money not yet saved this cycle.
 * 6. When money is short, bills come first, then goals, then budgets.
 *    Wollie reports the gap. It never shrinks a budget or goal by itself.
 * 7. Overspending and leftovers need no bookkeeping: both already show in
 *    the real balance, so they flow into the next cycle's free money.
 *
 * All amounts are major currency units (e.g. euros), like the rest of the
 * finance types. Round only for display.
 */

import type {
  FinancialAccount,
  FinanceTransaction,
  RecurringPayment,
} from './finance-demo'

const DAY_MS = 86_400_000

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

/** The given day in a month, clamped to the month length (31 → 30 in April). */
function dayInMonth(year: number, month: number, day: number) {
  return new Date(year, month, Math.min(day, daysInMonth(year, month)))
}

/**
 * Reads bank dates ("2026-09-14", "2026-09-14T10:00:00Z") and sample dates
 * without a year ("Jul 12"). A yearless date that would land in the future
 * belongs to last year.
 */
export function parseDate(value: string, referenceDate = new Date()): Date | null {
  if (!value) return null
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  if (/\d{4}/.test(value)) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
  }
  const parsed = new Date(`${value}, ${referenceDate.getFullYear()}`)
  if (Number.isNaN(parsed.getTime())) return null
  if (parsed.getTime() > referenceDate.getTime() + 7 * DAY_MS) parsed.setFullYear(parsed.getFullYear() - 1)
  return startOfDay(parsed)
}

/** Any supported date string as YYYY-MM-DD, or '' when unreadable. */
export function normalizeDate(value: string, referenceDate = new Date()) {
  const date = parseDate(value, referenceDate)
  return date ? toDateKey(date) : ''
}

export function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* ------------------------------------------------------------------ */
/* Payday and cycle                                                    */
/* ------------------------------------------------------------------ */

export type PayCycle = {
  /** First day of the cycle (inclusive). */
  start: Date
  /** Next payday: first day of the next cycle (exclusive end). */
  end: Date
  /** Days from today until the next payday, at least 1. */
  daysLeft: number
  paydayDay: number | null
  source: 'setting' | 'detected' | 'calendar'
}

function isIncome(transaction: FinanceTransaction) {
  if (transaction.amount <= 0) return false
  if (transaction.category === 'Transfer') return false
  return true
}

/**
 * Finds the usual salary day from the last ~4 months of income.
 * Takes the largest income per month; needs it in at least 2 months,
 * within 4 days of each other. Returns a day of month or null.
 */
export function detectPayday(
  transactions: FinanceTransaction[],
  referenceDate = new Date(),
): number | null {
  const since = startOfDay(referenceDate).getTime() - 125 * DAY_MS
  const largestByMonth = new Map<string, { amount: number; day: number }>()

  for (const transaction of transactions) {
    if (!isIncome(transaction)) continue
    const date = parseDate(transaction.date)
    if (!date || date.getTime() < since) continue
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const current = largestByMonth.get(key)
    if (!current || transaction.amount > current.amount) {
      largestByMonth.set(key, { amount: transaction.amount, day: date.getDate() })
    }
  }

  const months = [...largestByMonth.values()]
  if (months.length < 2) return null

  // Ignore months whose largest income is small next to the typical salary.
  const typical = Math.max(...months.map((month) => month.amount))
  const salaryDays = months
    .filter((month) => month.amount >= typical * 0.5)
    .map((month) => month.day)
    .sort((a, b) => a - b)
  if (salaryDays.length < 2) return null
  if (salaryDays[salaryDays.length - 1] - salaryDays[0] > 4) return null

  return salaryDays[Math.floor(salaryDays.length / 2)]
}

export function payCycle(
  referenceDate = new Date(),
  options: { paydayDay?: number | null; source?: PayCycle['source'] } = {},
): PayCycle {
  const today = startOfDay(referenceDate)
  const paydayDay = options.paydayDay ?? null
  const day = paydayDay && paydayDay >= 1 && paydayDay <= 31 ? paydayDay : 1
  const year = today.getFullYear()
  const month = today.getMonth()

  let start = dayInMonth(year, month, day)
  if (start > today) start = dayInMonth(year, month - 1, day)
  const end = dayInMonth(start.getFullYear(), start.getMonth() + 1, day)
  const daysLeft = Math.max(Math.round((end.getTime() - today.getTime()) / DAY_MS), 1)

  return {
    start,
    end,
    daysLeft,
    paydayDay: paydayDay ?? null,
    source: paydayDay ? (options.source ?? 'setting') : 'calendar',
  }
}

export function isInCycle(dateValue: string, cycle: PayCycle) {
  const date = parseDate(dateValue, cycle.end)
  if (!date) return false
  return date >= cycle.start && date < cycle.end
}

/* ------------------------------------------------------------------ */
/* Money you have                                                      */
/* ------------------------------------------------------------------ */

/** Checking and cash, minus what you owe on cards. Savings is not spending money. */
export function spendingMoney(accounts: FinancialAccount[]) {
  let total = 0
  for (const account of accounts) {
    if (account.type === 'Checking') total += account.balance
    if (account.type === 'Credit card') total += Math.min(account.balance, 0)
  }
  return total
}

export function savingsMoney(accounts: FinancialAccount[]) {
  return accounts
    .filter((account) => account.type === 'Savings')
    .reduce((sum, account) => sum + account.balance, 0)
}

/* ------------------------------------------------------------------ */
/* Bills                                                               */
/* ------------------------------------------------------------------ */

export type BillDue = {
  id: string
  name: string
  amount: number
  date: string
  category: string
}

/** Confirmed bills due from today until the next payday. */
export function billsDueBeforePayday(
  recurringPayments: RecurringPayment[],
  cycle: PayCycle,
  referenceDate = new Date(),
): BillDue[] {
  const today = startOfDay(referenceDate)
  return recurringPayments
    .filter((payment) => payment.confirmed !== false)
    .flatMap((payment) => {
      const date = parseDate(payment.nextDate)
      if (!date || date < today || date >= cycle.end) return []
      return [{
        id: payment.id,
        name: payment.merchant,
        amount: Math.abs(payment.amount),
        date: toDateKey(date),
        category: payment.category,
      }]
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

export type BudgetLimit = {
  id: string
  category: string
  limit: number
}

export type BudgetProgress = BudgetLimit & {
  spent: number
  /** Limit minus spent. Negative when over. */
  left: number
  /** Share of the limit still left, 0..1. The bar length. */
  leftShare: number
  state: 'ok' | 'low' | 'over'
}

function isSpending(transaction: FinanceTransaction) {
  return transaction.amount < 0 && transaction.category !== 'Transfer'
}

export function budgetProgress(
  limits: BudgetLimit[],
  transactions: FinanceTransaction[],
  cycle: PayCycle,
): BudgetProgress[] {
  const spentByCategory = new Map<string, number>()
  for (const transaction of transactions) {
    if (!isSpending(transaction) || !isInCycle(transaction.date, cycle)) continue
    const key = transaction.category.toLocaleLowerCase()
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + Math.abs(transaction.amount))
  }

  return limits.map((budget) => {
    const spent = round2(spentByCategory.get(budget.category.toLocaleLowerCase()) ?? 0)
    const left = round2(budget.limit - spent)
    const leftShare = budget.limit > 0 ? clamp(left / budget.limit, 0, 1) : 0
    const state = left < 0 ? 'over' : leftShare <= 0.15 ? 'low' : 'ok'
    return { ...budget, spent, left, leftShare, state }
  })
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export type Goal = {
  id: string
  name: string
  icon: string
  /** Total to reach, or null for an open-ended goal such as pension. */
  target: number | null
  /** Amount to move to savings each cycle. */
  monthly: number
  /** Optional deadline, YYYY-MM-DD. */
  targetDate: string | null
  /** Everything saved so far, including this cycle. */
  saved: number
  /** Saved during the current cycle. */
  savedThisCycle: number
  skippedThisCycle: boolean
}

export type GoalProgress = Goal & {
  /** Still to move this cycle. 0 when done or skipped. */
  due: number
  doneThisCycle: boolean
  /** Share of target reached, 0..1, or null without a target. */
  share: number | null
  reached: boolean
}

export function goalProgress(goal: Goal): GoalProgress {
  const reached = goal.target !== null && goal.saved >= goal.target
  const remainingToTarget = goal.target === null ? Infinity : Math.max(goal.target - goal.saved, 0)
  const wanted = Math.min(goal.monthly, goal.savedThisCycle + remainingToTarget)
  const due = goal.skippedThisCycle || reached
    ? 0
    : round2(Math.max(wanted - goal.savedThisCycle, 0))
  const share = goal.target && goal.target > 0 ? clamp(goal.saved / goal.target, 0, 1) : null
  return {
    ...goal,
    due,
    doneThisCycle: due === 0 && !goal.skippedThisCycle && goal.monthly > 0,
    share,
    reached,
  }
}

/* ------------------------------------------------------------------ */
/* The cycle plan                                                      */
/* ------------------------------------------------------------------ */

export type CyclePlan = {
  cycle: PayCycle
  spendingMoney: number
  billsDue: BillDue[]
  billsTotal: number
  goals: GoalProgress[]
  goalsDue: number
  budgets: BudgetProgress[]
  /** Sum of budget money still left (over-budget rows count as 0). */
  budgetsLeft: number
  budgetsLimit: number
  /** Spending money minus bills due and goal money not yet saved. */
  safeToSpend: number
  perDay: number
  /**
   * How much money is missing, 0 when fine. Covers bills, then goals, then
   * what is left in budgets, in that order.
   */
  short: number
  /** The first thing the shortfall reaches. */
  shortReaches: 'bills' | 'goals' | 'budgets' | null
}

export function buildCyclePlan(input: {
  accounts: FinancialAccount[]
  transactions: FinanceTransaction[]
  recurringPayments: RecurringPayment[]
  budgets: BudgetLimit[]
  goals: Goal[]
  paydayDay?: number | null
  referenceDate?: Date
}): CyclePlan {
  const referenceDate = input.referenceDate ?? new Date()
  const setting = input.paydayDay ?? null
  const detected = setting ? null : detectPayday(input.transactions, referenceDate)
  const cycle = payCycle(referenceDate, {
    paydayDay: setting ?? detected,
    source: setting ? 'setting' : 'detected',
  })

  const money = round2(spendingMoney(input.accounts))
  const billsDue = billsDueBeforePayday(input.recurringPayments, cycle, referenceDate)
  const billsTotal = round2(billsDue.reduce((sum, bill) => sum + bill.amount, 0))
  const goals = input.goals.map(goalProgress)
  const goalsDue = round2(goals.reduce((sum, goal) => sum + goal.due, 0))
  const budgets = budgetProgress(input.budgets, input.transactions, cycle)
  const budgetsLeft = round2(budgets.reduce((sum, budget) => sum + Math.max(budget.left, 0), 0))
  const budgetsLimit = round2(budgets.reduce((sum, budget) => sum + budget.limit, 0))

  const safeToSpend = round2(money - billsTotal - goalsDue)
  const perDay = round2(Math.max(safeToSpend, 0) / cycle.daysLeft)

  const needed = billsTotal + goalsDue + budgetsLeft
  const short = round2(Math.max(needed - money, 0))
  const shortReaches = short === 0
    ? null
    : money < billsTotal
      ? 'bills'
      : money < billsTotal + goalsDue
        ? 'goals'
        : 'budgets'

  return {
    cycle,
    spendingMoney: money,
    billsDue,
    billsTotal,
    goals,
    goalsDue,
    budgets,
    budgetsLeft,
    budgetsLimit,
    safeToSpend,
    perDay,
    short,
    shortReaches,
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/** Budget limits suggested from the last three full cycles of spending. */
export function suggestBudgets(
  transactions: FinanceTransaction[],
  cycle: PayCycle,
  categories: string[],
): Array<{ category: string; limit: number }> {
  const since = new Date(cycle.start)
  since.setMonth(since.getMonth() - 3)
  const totals = new Map<string, number>()
  for (const transaction of transactions) {
    if (!isSpending(transaction)) continue
    const date = parseDate(transaction.date)
    if (!date || date < since || date >= cycle.start) continue
    totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + Math.abs(transaction.amount))
  }
  return categories
    .map((category) => ({ category, limit: roundUp((totals.get(category) ?? 0) / 3) }))
    .filter((item) => item.limit > 0)
}

function roundUp(value: number) {
  if (value <= 0) return 0
  const step = value < 100 ? 10 : 25
  return Math.ceil(value / step) * step
}
