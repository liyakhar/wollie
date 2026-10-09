/**
 * Wollie insights (2026-10-09): what the Home, Spending, Budgets and Savings
 * screens show. Pure functions over bank data, so they are easy to test.
 *
 * Plain rules:
 * - Spending is money going out, except moves to savings and transfers.
 * - A month is the pay cycle: payday to the day before the next payday.
 * - Savings are ticked automatically: money moved out to savings during a
 *   month pays the goals in the order they were made, each up to its monthly
 *   amount. A choice made by hand ("saved €X" or "skip") always wins.
 */

import type { FinanceTransaction } from './finance-demo'
import { parseDate, payCycle, type PayCycle } from './money-cycle'

const DAY_MS = 86_400_000
const NOT_SPENDING = new Set(['transfer', 'savings', 'income'])
const SAVINGS = 'savings'

export function isSpend(transaction: FinanceTransaction) {
  return transaction.amount < 0 && !NOT_SPENDING.has(transaction.category.toLocaleLowerCase())
}

/** Rent and repeating bills: spending you set once, not day to day. */
export function isFixed(transaction: FinanceTransaction) {
  return isSpend(transaction) && (Boolean(transaction.recurring) || transaction.category.toLocaleLowerCase() === 'housing')
}

export function isEveryday(transaction: FinanceTransaction) {
  return isSpend(transaction) && !isFixed(transaction)
}

export function isMoveToSavings(transaction: FinanceTransaction) {
  return transaction.amount < 0 && transaction.category.toLocaleLowerCase() === SAVINGS
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/** The pay cycle `offset` months back (0 = this one). */
export function cycleAt(paydayDay: number | null, offset: number, referenceDate = new Date()): PayCycle {
  const reference = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const current = payCycle(reference, { paydayDay })
  if (offset === 0) return current
  // Any day inside the earlier cycle works as its reference.
  const inside = new Date(current.start.getFullYear(), current.start.getMonth() - offset, current.start.getDate())
  const earlier = payCycle(inside, { paydayDay })
  return { ...earlier, daysLeft: 0 }
}

function cycleDays(cycle: PayCycle) {
  return Math.round((cycle.end.getTime() - cycle.start.getTime()) / DAY_MS)
}

function inCycle(transaction: FinanceTransaction, cycle: PayCycle) {
  const date = parseDate(transaction.date, cycle.end)
  return Boolean(date && date >= cycle.start && date < cycle.end)
}

function dayIndex(transaction: FinanceTransaction, cycle: PayCycle) {
  const date = parseDate(transaction.date, cycle.end)
  if (!date) return -1
  return Math.floor((date.getTime() - cycle.start.getTime()) / DAY_MS)
}

/** Month name of a cycle: the month most of its days fall in. */
export function cycleLabel(cycle: PayCycle, style: 'long' | 'short' = 'long') {
  const middle = new Date((cycle.start.getTime() + cycle.end.getTime()) / 2)
  const name = middle.toLocaleDateString('en-GB', { month: 'long' })
  return style === 'short' ? name.slice(0, 3) : name
}

/* ------------------------------------------------------------------ */
/* Spending                                                            */
/* ------------------------------------------------------------------ */

export type CategorySpend = {
  category: string
  total: number
  lastMonth: number
  count: number
  /** Share of this month's spending, 0..1. */
  share: number
}

export type SpendingSummary = {
  total: number
  /** Last month's spending up to the same day of the month. */
  lastMonthByNow: number
  lastMonthTotal: number
  /** Cumulative spending per day of this month, up to today. */
  daily: number[]
  /** Cumulative spending per day of last month, stretched to this month's length. */
  lastDaily: number[]
  days: number
  /** Days of this month that have started, today included. */
  elapsed: number
  categories: CategorySpend[]
  /** Spending per month, oldest first, this month last. */
  history: Array<{ key: string; label: string; total: number }>
}

export function spendingSummary(
  transactions: FinanceTransaction[],
  paydayDay: number | null,
  referenceDate = new Date(),
  months = 6,
  include: (transaction: FinanceTransaction) => boolean = isSpend,
): SpendingSummary {
  const cycle = cycleAt(paydayDay, 0, referenceDate)
  const last = cycleAt(paydayDay, 1, referenceDate)
  const days = cycleDays(cycle)
  const lastDays = cycleDays(last)
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const elapsed = Math.min(days, Math.max(1, Math.floor((today.getTime() - cycle.start.getTime()) / DAY_MS) + 1))

  const perDay = new Array(days).fill(0)
  const lastPerDay = new Array(lastDays).fill(0)
  const byCategory = new Map<string, { total: number; lastMonth: number; count: number }>()
  const entry = (category: string) => {
    const current = byCategory.get(category) ?? { total: 0, lastMonth: 0, count: 0 }
    byCategory.set(category, current)
    return current
  }

  for (const transaction of transactions) {
    if (!include(transaction)) continue
    const amount = Math.abs(transaction.amount)
    if (inCycle(transaction, cycle)) {
      const index = dayIndex(transaction, cycle)
      if (index >= 0 && index < days) perDay[index] += amount
      const item = entry(transaction.category)
      item.total += amount
      item.count += 1
    } else if (inCycle(transaction, last)) {
      const index = dayIndex(transaction, last)
      if (index >= 0 && index < lastDays) lastPerDay[index] += amount
      entry(transaction.category).lastMonth += amount
    }
  }

  const cumulative = (values: number[]) => {
    let sum = 0
    return values.map((value) => round2((sum += value)))
  }
  const daily = cumulative(perDay).slice(0, elapsed)
  const lastCumulative = cumulative(lastPerDay)
  const lastDaily = Array.from({ length: days }, (_, index) => {
    const mapped = Math.min(lastDays - 1, Math.round((index * (lastDays - 1)) / Math.max(days - 1, 1)))
    return lastCumulative[mapped] ?? 0
  })

  const total = round2(daily[daily.length - 1] ?? 0)
  const categories = [...byCategory.entries()]
    .filter(([, value]) => value.total > 0 || value.lastMonth > 0)
    .map(([category, value]) => ({
      category,
      total: round2(value.total),
      lastMonth: round2(value.lastMonth),
      count: value.count,
      share: total > 0 ? value.total / total : 0,
    }))
    .sort((a, b) => b.total - a.total || b.lastMonth - a.lastMonth)

  const history = Array.from({ length: months }, (_, index) => {
    const offset = months - 1 - index
    const item = cycleAt(paydayDay, offset, referenceDate)
    const sum = transactions
      .filter((transaction) => include(transaction) && inCycle(transaction, item))
      .reduce((acc, transaction) => acc + Math.abs(transaction.amount), 0)
    return { key: item.start.toISOString().slice(0, 10), label: cycleLabel(item, 'short'), total: round2(sum) }
  })

  return {
    total,
    lastMonthByNow: lastDaily[elapsed - 1] ?? 0,
    lastMonthTotal: round2(lastCumulative[lastCumulative.length - 1] ?? 0),
    daily,
    lastDaily,
    days,
    elapsed,
    categories,
    history,
  }
}

/* ------------------------------------------------------------------ */
/* Savings                                                             */
/* ------------------------------------------------------------------ */

export type GoalRecord = {
  id: string
  monthly: number
  startedAt: Date
  /** Hand-made choices, keyed by cycle start (YYYY-MM-DD). */
  manual: Record<string, { amount: number; skipped: boolean }>
}

export type GoalMonth = {
  key: string
  label: string
  amount: number
  state: 'saved' | 'part' | 'skipped' | 'missed' | 'due' | 'upcoming'
  auto: boolean
}

export type GoalTrack = {
  id: string
  months: GoalMonth[]
  /** Everything put aside since the goal started (not counting the starting amount). */
  contributed: number
  thisMonth: GoalMonth
}

function keyOf(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Month by month, how much each goal got. Moves to savings in a month pay
 * the goals in order; a hand-made choice for a goal and month replaces it.
 */
export function trackGoals(
  goals: GoalRecord[],
  transactions: FinanceTransaction[],
  paydayDay: number | null,
  referenceDate = new Date(),
  months = 6,
): GoalTrack[] {
  if (goals.length === 0) return []
  const ordered = [...goals].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
  const tracks = new Map<string, GoalTrack>(ordered.map((goal) => [goal.id, { id: goal.id, months: [], contributed: 0, thisMonth: undefined as unknown as GoalMonth }]))
  const firstStart = ordered.reduce((min, goal) => Math.min(min, goal.startedAt.getTime()), Infinity)

  // Walk from the oldest relevant month to this one.
  let oldest = 0
  while (oldest < 120 && cycleAt(paydayDay, oldest + 1, referenceDate).end.getTime() > firstStart) oldest += 1

  for (let offset = oldest; offset >= 0; offset -= 1) {
    const cycle = cycleAt(paydayDay, offset, referenceDate)
    const key = keyOf(cycle.start)
    let pool = transactions
      .filter((transaction) => isMoveToSavings(transaction) && inCycle(transaction, cycle))
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)

    for (const goal of ordered) {
      if (cycle.end.getTime() <= goal.startedAt.getTime()) continue
      const track = tracks.get(goal.id)!
      const manual = goal.manual[key]
      let amount = 0
      let auto = false
      let skipped = false
      if (manual) {
        amount = manual.skipped ? 0 : manual.amount
        skipped = manual.skipped
      } else if (goal.monthly > 0 && pool > 0) {
        amount = Math.min(goal.monthly, pool)
        pool -= amount
        auto = true
      }
      amount = round2(amount)
      const done = goal.monthly > 0 ? amount >= goal.monthly - 0.005 : amount > 0
      const state: GoalMonth['state'] = skipped
        ? 'skipped'
        : done
          ? 'saved'
          : amount > 0
            ? 'part'
            : offset === 0
              ? 'due'
              : 'missed'
      const month = { key, label: cycleLabel(cycle, 'short'), amount, state, auto }
      track.contributed = round2(track.contributed + amount)
      track.months.push(month)
      if (offset === 0) track.thisMonth = month
    }
  }

  return ordered.map((goal) => {
    const track = tracks.get(goal.id)!
    const thisMonth = track.thisMonth ?? {
      key: keyOf(cycleAt(paydayDay, 0, referenceDate).start),
      label: cycleLabel(cycleAt(paydayDay, 0, referenceDate), 'short'),
      amount: 0,
      state: 'due' as const,
      auto: false,
    }
    return { ...track, months: track.months.slice(-months), thisMonth }
  })
}

/** "Jun 2030" when a goal with a target is reached at its monthly pace. */
export function projectedFinish(saved: number, target: number | null, monthly: number, referenceDate = new Date()) {
  if (target === null || monthly <= 0) return null
  if (saved >= target) return null
  const months = Math.ceil((target - saved) / monthly)
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + months, 1)
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

/** How far through the month we are, 0..1: where spending "should" be today. */
export function monthPace(elapsed: number, days: number) {
  return days > 0 ? Math.min(1, elapsed / days) : 0
}

export type PaceState = 'on-track' | 'fast' | 'over'

/**
 * Within budget, almost used (85%+ spent), or over the limit.
 * No day-by-day pace: many budgets (eating out, gifts) are spent in one go.
 */
export function paceState(spent: number, limit: number, _pace?: number): PaceState {
  if (limit <= 0) return 'on-track'
  if (spent > limit) return 'over'
  return spent / limit >= 0.85 ? 'fast' : 'on-track'
}
