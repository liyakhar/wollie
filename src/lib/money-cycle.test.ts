import { describe, expect, it } from 'vitest'
import type { FinancialAccount, FinanceTransaction, RecurringPayment } from './finance-demo'
import {
  budgetProgress,
  buildCyclePlan,
  detectPayday,
  goalProgress,
  payCycle,
  type Goal,
} from './money-cycle'

const today = new Date(2026, 8, 24) // 24 Sep 2026

function tx(date: string, amount: number, category = 'Groceries'): FinanceTransaction {
  return { id: `${date}-${amount}`, date, merchant: 'Shop', account: 'Main', category, amount, status: 'cleared' }
}

const accounts: FinancialAccount[] = [
  { id: 'a', name: 'Main', type: 'Checking', balance: 2000, institution: 'Bank', lastSynced: 'now' },
  { id: 'b', name: 'Card', type: 'Credit card', balance: -300, institution: 'Bank', lastSynced: 'now' },
  { id: 'c', name: 'Savings', type: 'Savings', balance: 5000, institution: 'Bank', lastSynced: 'now' },
]

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g', name: 'Travel', icon: 'plane', target: 3000, monthly: 200, targetDate: null,
    saved: 1200, savedThisCycle: 0, skippedThisCycle: false, ...overrides,
  }
}

describe('payday', () => {
  it('finds the usual salary day', () => {
    const transactions = [
      tx('2026-06-05', 3800, 'Income'),
      tx('2026-07-06', 3800, 'Income'),
      tx('2026-08-05', 3850, 'Income'),
      tx('2026-08-20', 40, 'Income'),
      tx('2026-09-04', 3800, 'Income'),
    ]
    expect(detectPayday(transactions, today)).toBe(5)
  })

  it('returns null for irregular income', () => {
    const transactions = [tx('2026-07-02', 900, 'Income'), tx('2026-08-19', 1100, 'Income')]
    expect(detectPayday(transactions, today)).toBeNull()
  })

  it('ignores transfers', () => {
    expect(detectPayday([tx('2026-08-05', 3800, 'Transfer'), tx('2026-09-05', 3800, 'Transfer')], today)).toBeNull()
  })
})

describe('cycle', () => {
  it('runs from payday to the next payday', () => {
    const cycle = payCycle(today, { paydayDay: 5 })
    expect(cycle.start).toEqual(new Date(2026, 8, 5))
    expect(cycle.end).toEqual(new Date(2026, 9, 5))
    expect(cycle.daysLeft).toBe(11)
  })

  it('uses the previous payday before this month’s payday', () => {
    const cycle = payCycle(new Date(2026, 8, 3), { paydayDay: 5 })
    expect(cycle.start).toEqual(new Date(2026, 7, 5))
  })

  it('clamps day 31 in short months', () => {
    const cycle = payCycle(new Date(2026, 1, 20), { paydayDay: 31 })
    expect(cycle.start).toEqual(new Date(2026, 0, 31))
    expect(cycle.end).toEqual(new Date(2026, 1, 28))
  })

  it('falls back to the calendar month', () => {
    const cycle = payCycle(today)
    expect(cycle.source).toBe('calendar')
    expect(cycle.start).toEqual(new Date(2026, 8, 1))
  })
})

describe('budgets', () => {
  const cycle = payCycle(today, { paydayDay: 5 })

  it('counts only spending in this cycle', () => {
    const [groceries] = budgetProgress(
      [{ id: '1', category: 'Groceries', limit: 400 }],
      [tx('2026-09-10', -200), tx('2026-09-20', -80), tx('2026-09-02', -500), tx('2026-09-12', 50)],
      cycle,
    )
    expect(groceries.spent).toBe(280)
    expect(groceries.left).toBe(120)
    expect(groceries.leftShare).toBeCloseTo(0.3)
    expect(groceries.state).toBe('ok')
  })

  it('marks low and over', () => {
    const [fun, food] = budgetProgress(
      [{ id: '1', category: 'Fun', limit: 100 }, { id: '2', category: 'Dining', limit: 250 }],
      [tx('2026-09-10', -88, 'Fun'), tx('2026-09-11', -270, 'Dining')],
      cycle,
    )
    expect(fun.leftShare).toBeCloseTo(0.12)
    expect(fun.state).toBe('low')
    expect(food.left).toBe(-20)
    expect(food.leftShare).toBe(0)
    expect(food.state).toBe('over')
  })
})

describe('goals', () => {
  it('asks for the monthly amount until saved', () => {
    expect(goalProgress(goal()).due).toBe(200)
    expect(goalProgress(goal({ savedThisCycle: 200, saved: 1400 })).doneThisCycle).toBe(true)
  })

  it('asks only for what is left to reach the target', () => {
    expect(goalProgress(goal({ saved: 2900 })).due).toBe(100)
    expect(goalProgress(goal({ saved: 3000 })).reached).toBe(true)
    expect(goalProgress(goal({ saved: 3000 })).due).toBe(0)
  })

  it('supports open-ended goals', () => {
    const pension = goalProgress(goal({ target: null, monthly: 150, saved: 2640 }))
    expect(pension.share).toBeNull()
    expect(pension.due).toBe(150)
  })

  it('asks nothing when skipped', () => {
    expect(goalProgress(goal({ skippedThisCycle: true })).due).toBe(0)
  })
})

describe('cycle plan', () => {
  const bills: RecurringPayment[] = [
    { id: 'r', merchant: 'Rent', amount: 950, cadence: 'monthly', nextDate: '2026-10-01', category: 'Housing', confirmed: true },
    { id: 'i', merchant: 'Internet', amount: 49, cadence: 'monthly', nextDate: '2026-10-09', category: 'Subscriptions', confirmed: true },
    { id: 'd', merchant: 'Maybe', amount: 20, cadence: 'monthly', nextDate: '2026-09-30', category: 'Subscriptions', confirmed: false },
  ]

  it('subtracts bills before payday and goals due from spending money', () => {
    const plan = buildCyclePlan({
      accounts,
      transactions: [tx('2026-09-10', -100)],
      recurringPayments: bills,
      budgets: [{ id: '1', category: 'Groceries', limit: 400 }],
      goals: [goal()],
      paydayDay: 5,
      referenceDate: today,
    })
    expect(plan.spendingMoney).toBe(1700) // 2000 − 300 card, savings excluded
    expect(plan.billsTotal).toBe(950) // internet is after payday, "Maybe" unconfirmed
    expect(plan.goalsDue).toBe(200)
    expect(plan.safeToSpend).toBe(550)
    expect(plan.perDay).toBe(50) // 550 / 11 days
    expect(plan.budgetsLeft).toBe(300)
    expect(plan.short).toBe(0)
  })

  it('reports a shortfall in priority order', () => {
    const plan = buildCyclePlan({
      accounts: [{ ...accounts[0], balance: 1100 }],
      transactions: [],
      recurringPayments: bills,
      budgets: [{ id: '1', category: 'Groceries', limit: 400 }],
      goals: [goal()],
      paydayDay: 5,
      referenceDate: today,
    })
    // needs 950 bills + 200 goal + 400 budget = 1550, has 1100
    expect(plan.short).toBe(450)
    expect(plan.shortReaches).toBe('goals')
    expect(plan.safeToSpend).toBe(-50)
    expect(plan.perDay).toBe(0)
  })
})
