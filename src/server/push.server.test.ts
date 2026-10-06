import { describe, expect, it, vi } from 'vitest'

vi.mock('#/server/db-access.server', () => ({ getDb: vi.fn() }))

import { computeAlerts } from './push.server'
import type { MoneyOverview } from '#/lib/money-overview'

const base = {
  currency: 'EUR',
  cycle: { start: '2026-10-01', end: '2026-10-31', daysLeft: 25, paydayDay: 1, source: 'setting' },
  budgets: [],
  bills: [],
  short: 0,
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

  it('sends nothing when all is fine', () => {
    expect(computeAlerts(base)).toEqual([])
  })
})
