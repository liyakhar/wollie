import { describe, expect, it } from 'vitest'
import type { FinanceTransaction } from './finance-demo'
import { cycleAt, isEveryday, isFixed, paceState, projectedFinish, spendingSummary, trackGoals } from './money-insights'

const tx = (date: string, amount: number, category: string, id = `${date}-${amount}-${category}`): FinanceTransaction => ({
  id, date, merchant: category, account: 'Everyday', category, amount, status: 'cleared',
})

const today = new Date(2026, 9, 9) // 9 Oct 2026

describe('cycleAt', () => {
  it('walks back whole months from payday', () => {
    expect(cycleAt(25, 0, today).start).toEqual(new Date(2026, 8, 25))
    expect(cycleAt(25, 1, today).start).toEqual(new Date(2026, 7, 25))
    expect(cycleAt(null, 2, today).start).toEqual(new Date(2026, 7, 1))
  })
})

describe('spendingSummary', () => {
  const data = [
    tx('2026-10-01', 3200, 'Income'),
    tx('2026-10-01', -1400, 'Housing'),
    tx('2026-10-02', -1000, 'Savings'),
    tx('2026-10-03', -50, 'Groceries'),
    tx('2026-10-08', -20, 'Dining'),
    tx('2026-09-02', -40, 'Groceries'),
    tx('2026-09-20', -300, 'Shopping'),
    tx('2026-09-05', -500, 'Transfer'),
  ]
  const summary = spendingSummary(data, null, today)

  it('counts spending, not income, savings or transfers', () => {
    expect(summary.total).toBe(1470)
    expect(summary.lastMonthTotal).toBe(340)
  })
  it('builds a running total per day up to today', () => {
    expect(summary.elapsed).toBe(9)
    expect(summary.daily).toHaveLength(9)
    expect(summary.daily[0]).toBe(1400)
    expect(summary.daily[8]).toBe(1470)
  })
  it('compares with last month by the same day', () => {
    expect(summary.lastMonthByNow).toBe(40)
  })
  it('sorts categories by spend and keeps last month', () => {
    expect(summary.categories.map((item) => item.category)).toEqual(['Housing', 'Groceries', 'Dining', 'Shopping'])
    expect(summary.categories[1]).toMatchObject({ total: 50, lastMonth: 40, count: 1 })
  })
  it('lists six months, this one last', () => {
    expect(summary.history).toHaveLength(6)
    expect(summary.history.at(-1)).toMatchObject({ label: 'Oct', total: 1470 })
    expect(summary.history.at(-2)).toMatchObject({ label: 'Sep', total: 340 })
  })
})

describe('everyday spending', () => {
  it('leaves out rent and repeating bills', () => {
    const data = [
      tx('2026-10-01', -1400, 'Housing'),
      { ...tx('2026-10-04', -12.99, 'Subscriptions'), recurring: true },
      tx('2026-10-05', -30, 'Groceries'),
    ]
    expect(spendingSummary(data, null, today, 6, isEveryday).total).toBe(30)
    expect(spendingSummary(data, null, today, 6, isFixed).total).toBe(1412.99)
  })
})

describe('trackGoals', () => {
  const goals = [
    { id: 'house', monthly: 1000, startedAt: new Date(2026, 6, 20), manual: {} },
    { id: 'travel', monthly: 200, startedAt: new Date(2026, 6, 21), manual: {} as Record<string, { amount: number; skipped: boolean }> },
  ]
  const moves = [
    tx('2026-08-02', -1200, 'Savings'),
    tx('2026-09-02', -1000, 'Savings'),
    tx('2026-10-02', -1000, 'Savings'),
  ]

  it('pays goals in order from money moved to savings', () => {
    const [house, travel] = trackGoals(goals, moves, null, today)
    expect(house.months.map((month) => month.state)).toEqual(['missed', 'saved', 'saved', 'saved'])
    expect(travel.months.map((month) => month.state)).toEqual(['missed', 'saved', 'missed', 'due'])
    expect(house.contributed).toBe(3000)
    expect(travel.contributed).toBe(200)
    expect(house.thisMonth).toMatchObject({ state: 'saved', auto: true, amount: 1000 })
  })

  it('lets a hand-made choice win', () => {
    const withSkip = [goals[0], { ...goals[1], manual: { '2026-10-01': { amount: 0, skipped: true } } }]
    const [, travel] = trackGoals(withSkip, moves, null, today)
    expect(travel.thisMonth.state).toBe('skipped')
  })
})

describe('helpers', () => {
  it('projects the finish month', () => {
    expect(projectedFinish(14000, 60000, 1000, today)).toBe('Aug 2030')
    expect(projectedFinish(100, null, 50, today)).toBeNull()
  })
  it('flags fast and over spending', () => {
    expect(paceState(50, 100, 0.3)).toBe('fast')
    expect(paceState(30, 100, 0.3)).toBe('on-track')
    expect(paceState(120, 100, 0.3)).toBe('over')
  })
})
