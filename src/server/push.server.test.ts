import { describe, expect, it, vi } from 'vitest'

vi.mock('#/server/db-access.server', () => ({ getDb: vi.fn() }))

import { computeAlerts } from './push.server'
import type { MoneyOverview } from '#/lib/money-overview'

const base = {
  currency: 'EUR',
  cycle: { start: '2026-10-01', end: '2026-10-31', daysLeft: 25, paydayDay: 1, source: 'setting' },
  budgets: [],
  bills: [],
  goals: [],
  short: 0,
  month: { label: 'October', elapsed: 6, days: 31, pace: 0.2 },
} as unknown as MoneyOverview

describe('computeAlerts', () => {
  it('warns when a budget is nearly used up and when it is over', () => {
    const alerts = computeAlerts({
      ...base,
      budgets: [
        { id: 'a', category: 'Groceries', limit: 400, spent: 380, left: 20, leftShare: 0.05, state: 'low' },
        { id: 'b', category: 'Transport', limit: 150, spent: 171.5, left: -21.5, leftShare: 0, state: 'over' },
        { id: 'c', category: 'Dining', limit: 250, spent: 10, left: 240, leftShare: 0.96, state: 'ok' },
      ],
    } as MoneyOverview)
    expect(alerts.map((a) => a.key)).toEqual([
      'budget-low:Groceries:2026-10-01',
      'budget-over:Transport:2026-10-01',
    ])
    expect(alerts[1].body).toContain('21.50')
  })

  it('reminds about bills due within three days only', () => {
    const now = new Date('2026-10-06T10:00:00Z')
    const alerts = computeAlerts(
      {
        ...base,
        bills: [
          { id: 'r', name: 'Rent', amount: 980, date: '2026-10-08', category: 'Housing' },
          { id: 'x', name: 'Gym', amount: 20, date: '2026-10-20', category: 'Fun' },
        ],
      } as MoneyOverview,
      now,
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0].title).toBe('Rent is due in 2 days')
  })

  it('asks to save after payday and thanks when Wollie sees the money move', () => {
    const goal = (id: string, due: number, auto: boolean) => ({
      id, name: id, due, target: 3000, saved: 1200, monthly: 200,
      thisMonth: { key: '2026-10-01', label: 'Oct', amount: 200 - due, state: due ? 'due' : 'saved', auto },
    })
    const alerts = computeAlerts({
      ...base,
      month: { label: 'October', elapsed: 2, days: 31, pace: 0.06 },
      goals: [goal('Travel', 200, false), goal('House', 0, true)],
    } as unknown as MoneyOverview)
    expect(alerts.map((a) => a.key)).toEqual(['save:2026-10-01', 'saved:House:2026-10-01'])
    expect(alerts[0].title).toContain('200')
  })

  it('sends nothing when all is fine', () => {
    expect(computeAlerts(base)).toEqual([])
  })
})
