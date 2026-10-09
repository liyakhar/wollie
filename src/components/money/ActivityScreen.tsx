import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { IconChevronLeft, IconChevronRight, IconSearch, IconClose } from './icons'
import {
  formatMoney,
  type FinanceTransaction,
  type TransactionCategoryName,
} from '#/lib/finance-demo'
import {
  createFinanceTransactionCategory,
  updateFinanceTransactionCategory,
} from '#/server/finance'
import { normalizeDate } from '#/lib/money-cycle'
import { Bar, SplitMoney } from './HomeScreen'
import { categoryIcon, categoryLabel } from './icons'
import { Sheet } from './Sheet'

export type ActivityData = {
  categoryOptions: string[]
  transactions: FinanceTransaction[]
}

function readableMerchant(value: string) {
  const issuedBy = value.match(/\bissued by\s+(.+)$/i)
  const name = (issuedBy?.[1] || value).replace(/^CARD-\d+\s*[·-]\s*/i, '').trim()
  return name.replace(/\b([\p{L}'-]+)\s+\1$/iu, '$1').trim() || 'Unknown'
}

function parseDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function dayLabel(value: string) {
  const date = parseDate(value)
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const diff = Math.round((start - date.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
}

function monthKey(value: string) {
  return value.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function ActivityScreen({ data, readOnly = false, embedded = false }: { data: ActivityData; readOnly?: boolean; embedded?: boolean }) {
  const router = useRouter()
  // Bank data uses ISO dates, sample data uses "Jul 12". Work in ISO.
  const transactions = useMemo(
    () => data.transactions.map((transaction) => ({ ...transaction, date: normalizeDate(transaction.date) || transaction.date })),
    [data.transactions],
  )
  const currency = transactions.find((transaction) => transaction.currency)?.currency || 'EUR'
  const money = (value: number) => formatMoney(value, currency)

  const [view, setView] = useState<'date' | 'category'>('date')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [reviewOnly, setReviewOnly] = useState(false)
  const months = useMemo(
    () => [...new Set(transactions.map((transaction) => monthKey(transaction.date)))].sort().reverse(),
    [transactions],
  )
  const [monthIndex, setMonthIndex] = useState(0)
  const month = months[monthIndex]
  const [active, setActive] = useState<FinanceTransaction | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reviewCount = transactions.filter((transaction) => transaction.status === 'needs-review').length
  const categories = useMemo(
    () => [...new Set([...data.categoryOptions, ...transactions.map((transaction) => transaction.category), 'Income', 'Transfer'])],
    [data.categoryOptions, transactions],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return transactions.filter((transaction) => {
      if (reviewOnly && transaction.status !== 'needs-review') return false
      if (category && transaction.category !== category) return false
      if (!q) return true
      return `${transaction.merchant} ${transaction.category} ${transaction.account}`.toLocaleLowerCase().includes(q)
    })
  }, [category, query, reviewOnly, transactions])

  const groups = useMemo(() => {
    const byDay = new Map<string, FinanceTransaction[]>()
    for (const transaction of [...filtered].sort((a, b) => b.date.localeCompare(a.date))) {
      const key = transaction.date.slice(0, 10)
      byDay.set(key, [...(byDay.get(key) ?? []), transaction])
    }
    return [...byDay.entries()]
  }, [filtered])

  const byCategory = useMemo(() => {
    const totals = new Map<string, { total: number; count: number }>()
    for (const transaction of transactions) {
      if (transaction.amount >= 0 || transaction.category === 'Transfer') continue
      if (monthKey(transaction.date) !== month) continue
      const current = totals.get(transaction.category) ?? { total: 0, count: 0 }
      totals.set(transaction.category, { total: current.total + Math.abs(transaction.amount), count: current.count + 1 })
    }
    const rows = [...totals.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.total - a.total)
    const total = rows.reduce((sum, row) => sum + row.total, 0)
    return { rows, total }
  }, [month, transactions])

  async function run(action: () => Promise<unknown>, done: () => void) {
    setBusy(true)
    setError('')
    try {
      await action()
      await router.invalidate()
      done()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const Wrapper = embedded ? 'div' : 'main'
  return (
    <Wrapper {...(embedded ? { className: 'w-embedded' } : { id: 'main', className: 'm-screen m-screen--tight' })}>
      {!embedded && (
        <header className="m-title-row">
          <h1>Payments</h1>
        </header>
      )}

      <div className="m-toolbar">
        <label className="m-search">
          <IconSearch aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search transactions"
            aria-label="Search transactions"
          />
        </label>
        {!embedded && (
          <div className="m-switch" role="tablist" aria-label="View" data-second={view === 'category' || undefined}>
            <button type="button" role="tab" aria-selected={view === 'date'} onClick={() => setView('date')}>By date</button>
            <button type="button" role="tab" aria-selected={view === 'category'} onClick={() => setView('category')}>By category</button>
          </div>
        )}
      </div>

      {view === 'date' ? (
        <>
          {(category || reviewCount > 0) && (
            <div className="m-chips">
              {category && (
                <button type="button" className="m-chip is-on" onClick={() => setCategory(null)}>
                  {categoryLabel(category)} <IconClose aria-hidden="true" />
                </button>
              )}
              {reviewCount > 0 && (
                <button type="button" className={`m-chip${reviewOnly ? ' is-on' : ''}`} onClick={() => setReviewOnly(!reviewOnly)}>
                  <span className="m-dot m-dot--small" aria-hidden="true" /> Needs a category · {reviewCount}
                </button>
              )}
            </div>
          )}

          {groups.length === 0 ? (
            <section className="m-empty">
              <p>{transactions.length ? 'No transactions match.' : 'Transactions appear here after your bank syncs.'}</p>
            </section>
          ) : (
            groups.map(([day, items]) => (
              <section key={day} className="m-section m-section--day">
                <h2 className="m-day">{dayLabel(day)}</h2>
                <ul className="m-list">
                  {items.map((transaction) => {
                    const Icon = categoryIcon(transaction.category)
                    const row = (
                      <>
                        <Icon className="m-row__icon" aria-hidden="true" />
                        <span className="m-row__main">
                          <span className="m-row__title">{readableMerchant(transaction.merchant)}</span>
                          <span className="m-row__meta">
                            {transaction.status === 'needs-review'
                              ? <span className="m-accent">Choose a category</span>
                              : categoryLabel(transaction.category)}
                            {transaction.status === 'pending' ? ' · Pending' : ''}
                          </span>
                        </span>
                        <span className={`m-row__amount${transaction.amount > 0 ? ' m-positive' : ''}`}>
                          {transaction.amount > 0 ? '+' : ''}{money(transaction.amount)}
                        </span>
                      </>
                    )
                    return (
                      <li key={transaction.id}>
                        {readOnly ? (
                          <div className="m-row">{row}</div>
                        ) : (
                          <button type="button" className="m-row m-row__button m-row__button--flat" onClick={() => { setActive(transaction); setNewCategory(''); setError('') }}>
                            {row}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      ) : (
        <>
          <div className="m-month">
            <button type="button" className="m-icon-button" aria-label="Previous month" disabled={monthIndex >= months.length - 1} onClick={() => setMonthIndex(monthIndex + 1)}>
              <IconChevronLeft aria-hidden="true" />
            </button>
            <span>{month ? monthLabel(month) : '—'}</span>
            <button type="button" className="m-icon-button" aria-label="Next month" disabled={monthIndex === 0} onClick={() => setMonthIndex(monthIndex - 1)}>
              <IconChevronRight aria-hidden="true" />
            </button>
          </div>

          <section className="m-hero m-hero--compact" aria-label="Spent">
            <p className="m-hero__label">Spent</p>
            <p className="m-hero__number"><SplitMoney value={byCategory.total} currency={currency} /></p>
          </section>

          <ul className="m-list m-list--roomy">
            {byCategory.rows.map((row) => {
              const Icon = categoryIcon(row.name)
              return (
                <li key={row.name} className="m-row m-row--stack">
                  <button type="button" className="m-row__button" onClick={() => { setCategory(row.name); setView('date') }}>
                    <Icon className="m-row__icon" aria-hidden="true" />
                    <span className="m-row__main">
                      <span className="m-row__line">
                        <span className="m-row__title">{categoryLabel(row.name)}</span>
                        <span className="m-row__value">{money(row.total)}</span>
                      </span>
                      <Bar share={byCategory.total ? row.total / byCategory.total : 0} />
                      <span className="m-row__meta">
                        {row.count} {row.count === 1 ? 'transaction' : 'transactions'} · {Math.round((row.total / (byCategory.total || 1)) * 100)}%
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Sheet open={active !== null} title={active ? readableMerchant(active.merchant) : ''} onClose={() => setActive(null)}>
        {active && (
          <div className="m-form">
            <p className="m-hint">
              {money(active.amount)} · {parseDate(active.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} · {active.account}
            </p>
            <div className="m-choices" role="radiogroup" aria-label="Category">
              {categories.map((name) => {
                const Icon = categoryIcon(name)
                const selected = name === active.category && active.status !== 'needs-review'
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`m-choice${selected ? ' is-selected' : ''}`}
                    disabled={busy}
                    onClick={() => void run(
                      () => updateFinanceTransactionCategory({ data: { transactionId: active.id, category: name as TransactionCategoryName } }),
                      () => setActive(null),
                    )}
                  >
                    <Icon aria-hidden="true" />
                    <span>{categoryLabel(name)}</span>
                  </button>
                )
              })}
            </div>
            <form
              className="m-inline-form"
              onSubmit={(event) => {
                event.preventDefault()
                const name = newCategory.trim()
                if (!name) return
                void run(async () => {
                  await createFinanceTransactionCategory({ data: { name } })
                  await updateFinanceTransactionCategory({ data: { transactionId: active.id, category: name as TransactionCategoryName } })
                }, () => setActive(null))
              }}
            >
              <label className="m-field">
                <span>New category</span>
                <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Pets" maxLength={48} />
              </label>
              <button type="submit" className="m-button" disabled={busy || !newCategory.trim()}>Add</button>
            </form>
            {error && <p className="m-error" role="alert">{error}</p>}
          </div>
        )}
      </Sheet>
    </Wrapper>
  )
}
