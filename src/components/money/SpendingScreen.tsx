import { useMemo, useState } from 'react'
import { formatMoney, type FinanceTransaction } from '#/lib/finance-demo'
import { cycleAt, spendingSummary, isEveryday, isFixed } from '#/lib/money-insights'
import { normalizeDate } from '#/lib/money-cycle'
import type { MoneyOverview } from '#/lib/money-overview'
import { ActivityScreen, type ActivityData } from './ActivityScreen'
import { MonthBars, Ring, chartColor } from './charts'
import { wholeMoney } from './HomeScreen'
import { IconChevronLeft, IconChevronRight, categoryIcon, categoryLabel } from './icons'
import { Sheet } from './Sheet'

const DAY_MS = 86_400_000

export function SpendingScreen({ overview, data, readOnly = false }: { overview: MoneyOverview; data: ActivityData; readOnly?: boolean }) {
  const [tab, setTab] = useState<'overview' | 'payments'>('overview')
  const [who, setWho] = useState<string>('all')
  const [offset, setOffset] = useState(0)
  const [open, setOpen] = useState<string | null>(null)
  const currency = overview.currency
  const whole = (value: number) => wholeMoney(value, currency)
  const payday = overview.cycle.paydayDay

  const transactions = useMemo(() => {
    const all = data.transactions.map((transaction) => ({ ...transaction, date: normalizeDate(transaction.date) || transaction.date }))
    if (who === 'all') return all
    return all.filter((transaction) => transaction.accountId && overview.accountOwners[transaction.accountId] === who)
  }, [data.transactions, overview.accountOwners, who])

  // Months that have data, newest first (at most 6).
  const maxOffset = Math.max(0, overview.spending.history.filter((month) => month.total > 0).length - 1)
  const reference = useMemo(() => {
    if (offset === 0) return new Date()
    return new Date(cycleAt(payday, offset).end.getTime() - DAY_MS)
  }, [offset, payday])
  const summary = useMemo(() => spendingSummary(transactions, payday, reference, 6, isEveryday), [transactions, payday, reference])
  const previous = useMemo(() => spendingSummary(transactions, payday, new Date(cycleAt(payday, offset + 1).end.getTime() - DAY_MS), 6, isEveryday), [transactions, payday, offset])
  const fixedItems = useMemo(() => {
    const cycle = cycleAt(payday, offset)
    return transactions
      .filter((transaction) => {
        if (!isFixed(transaction) || transaction.amount >= 0 || transaction.category === 'Savings' || transaction.category === 'Transfer') return false
        const date = new Date(`${transaction.date.slice(0, 10)}T12:00:00`)
        return date >= cycle.start && date < cycle.end
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [transactions, payday, offset])
  const fixedTotal = fixedItems.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
  const selected = cycleAt(payday, offset)
  const middle = new Date((selected.start.getTime() + selected.end.getTime()) / 2)
  const monthName = middle.toLocaleDateString('en-GB', {
    month: 'long',
    ...(middle.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {}),
  })
  const compare = offset === 0 ? summary.lastMonthByNow : previous.total
  const diff = summary.total - compare
  const categories = summary.categories.filter((item) => item.total > 0)
  const otherMember = overview.members.find((member) => !member.you)

  const detail = open ? categoryDetail(open, transactions, payday, reference) : null

  return (
    <main id="main" className="m-screen m-screen--tight">
      <header className="m-title-row w-title">
        <h1>Spending</h1>
      </header>

      <div className="m-switch w-switch" role="tablist" aria-label="View" data-second={tab === 'payments' || undefined}>
        <button type="button" role="tab" aria-selected={tab === 'overview'} onClick={() => setTab('overview')}>Overview</button>
        <button type="button" role="tab" aria-selected={tab === 'payments'} onClick={() => setTab('payments')}>Payments</button>
      </div>

      {overview.members.length > 1 && (
        <div className="m-chips w-who" role="radiogroup" aria-label="Whose spending">
          {[{ id: 'all', name: 'Together' }, ...overview.members.map((member) => ({ id: member.id, name: member.you ? 'Me' : member.name }))].map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={who === option.id}
              className={`m-chip${who === option.id ? ' is-on' : ''}`}
              onClick={() => setWho(option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}

      {tab === 'payments' ? (
        <ActivityScreen data={{ ...data, transactions }} readOnly={readOnly} embedded />
      ) : (
        <>
          <div className="m-month w-month">
            <button type="button" className="m-icon-button" aria-label="Previous month" disabled={offset >= maxOffset} onClick={() => setOffset(offset + 1)}>
              <IconChevronLeft aria-hidden="true" />
            </button>
            <span>{monthName}</span>
            <button type="button" className="m-icon-button" aria-label="Next month" disabled={offset === 0} onClick={() => setOffset(offset - 1)}>
              <IconChevronRight aria-hidden="true" />
            </button>
          </div>

          <section className="w-ring-block" aria-label={`Spent in ${monthName}`}>
            <Ring segments={categories.map((item, index) => ({ value: item.total, color: chartColor(index) }))} size={212} thickness={20}>
              <span className="w-label">Everyday</span>
              <span className="w-ring__total">{whole(summary.total)}</span>
              {compare > 0 && (
                <span className={`w-delta w-delta--small ${diff <= 0 ? 'is-good' : 'is-up'}`}>
                  {diff <= 0 ? '↓' : '↑'} {whole(Math.abs(diff))}
                </span>
              )}
            </Ring>
            {compare > 0 && (
              <p className="w-ring-note">
                {diff <= 0 ? 'Less' : 'More'} than {offset === 0 ? `${summary.history.at(-2)?.label} by this day` : summary.history.at(-2)?.label}
                {who !== 'all' && otherMember ? ` · ${who === otherMember.id ? otherMember.name : 'you'} only` : ''}
              </p>
            )}
          </section>

          {categories.length === 0 ? (
            <section className="m-empty"><p>No spending this month yet.</p></section>
          ) : (
            <ul className="m-list w-cat-list">
              {categories.map((item, index) => {
                const Icon = categoryIcon(item.category)
                return (
                  <li key={item.category}>
                    <button type="button" className="m-row m-row__button m-row__button--flat w-cat-row" onClick={() => setOpen(item.category)}>
                      <span className="w-cat-row__icon" style={{ background: chartColor(index) }}>
                        <Icon aria-hidden="true" style={{ color: index === 0 || index === 3 || index === 6 ? '#fbfbf9' : '#111' }} />
                      </span>
                      <span className="m-row__main">
                        <span className="m-row__line">
                          <span className="m-row__title">{categoryLabel(item.category)}</span>
                          <span className="m-row__amount">{whole(item.total)}</span>
                        </span>
                        <span className="m-row__line">
                          <span className="m-row__meta">{item.count} {item.count === 1 ? 'payment' : 'payments'} · {Math.round(item.share * 100)}%</span>
                          {item.lastMonth > 0 && <span className="m-row__meta">{summary.history.at(-2)?.label} {whole(item.lastMonth)}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {fixedItems.length > 0 && (
            <section className="m-section">
              <div className="m-section__head m-section__head--static"><h2>Rent and bills</h2><span className="w-head-total">{whole(fixedTotal)}</span></div>
              <ul className="m-list">
                {fixedItems.map((transaction) => {
                  const Icon = categoryIcon(transaction.category)
                  return (
                    <li key={transaction.id} className="m-row">
                      <Icon className="m-row__icon" aria-hidden="true" />
                      <span className="m-row__main">
                        <span className="m-row__title">{transaction.merchant}</span>
                        <span className="m-row__meta">{new Date(`${transaction.date.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {categoryLabel(transaction.category)}</span>
                      </span>
                      <span className="m-row__amount">{formatMoney(Math.abs(transaction.amount), currency)}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section className="m-section">
            <div className="m-section__head m-section__head--static"><h2>Everyday, last 6 months</h2></div>
            <MonthBars months={summary.history} format={whole} />
          </section>
        </>
      )}

      <Sheet open={detail !== null} title={open ? categoryLabel(open) : ''} onClose={() => setOpen(null)}>
        {detail && (
          <div className="m-form">
            <p className="w-sheet-total">{whole(detail.total)} <span className="m-quiet">in {monthName}</span></p>
            <MonthBars months={detail.history} format={whole} />
            <ul className="m-list">
              {detail.items.map((transaction) => (
                <li key={transaction.id} className="m-row">
                  <span className="m-row__main">
                    <span className="m-row__title">{transaction.merchant}</span>
                    <span className="m-row__meta">
                      {new Date(transaction.date.slice(0, 10)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {transaction.account}
                    </span>
                  </span>
                  <span className="m-row__amount">{formatMoney(transaction.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>
    </main>
  )
}

function categoryDetail(category: string, transactions: FinanceTransaction[], payday: number | null, reference: Date) {
  const inCategory = transactions.filter((transaction) => transaction.category === category)
  const summary = spendingSummary(inCategory, payday, reference, 6, isEveryday)
  const cycle = cycleAt(payday, 0, reference)
  const items = inCategory
    .filter((transaction) => {
      if (!isEveryday(transaction)) return false
      const date = new Date(`${transaction.date.slice(0, 10)}T12:00:00`)
      return date >= cycle.start && date < cycle.end
    })
    .sort((a, b) => b.date.localeCompare(a.date))
  return { total: summary.total, history: summary.history, items }
}
