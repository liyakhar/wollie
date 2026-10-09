import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { IconAdd } from './icons'
import type { MoneyOverview } from '#/lib/money-overview'
import { saveBudget, setPayday } from '#/server/money'
import { BudgetRow, paydayLabel, wholeMoney } from './HomeScreen'
import { paceState } from '#/lib/money-insights'
import { categoryIcon, categoryLabel } from './icons'
import { Sheet } from './Sheet'
import { AlertsCard } from './AlertsCard'

type Editing =
  | { mode: 'add'; category: string; limit: string }
  | { mode: 'edit'; category: string; limit: string }
  | null

export function BudgetsScreen({ overview, demo = false }: { overview: MoneyOverview; demo?: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Editing>(null)
  const [paydayOpen, setPaydayOpen] = useState(false)
  const [payday, setPaydayValue] = useState(String(overview.paydaySetting ?? overview.cycle.paydayDay ?? ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  const resets = overview.cycle.source === 'calendar'
    ? `Resets ${paydayLabel(overview)}`
    : `Resets on payday, ${paydayLabel(overview)}`
  const whole = (value: number) => wholeMoney(value, overview.currency)
  const spent = overview.budgets.reduce((sum, budget) => sum + budget.spent, 0)
  const state = paceState(spent, overview.budgetsLimit, overview.month.pace)
  const daysLeft = Math.max(overview.month.days - overview.month.elapsed, 0)
  const openAdd = (category?: string) => {
    const option = overview.budgetOptions.find((item) => item.category === category) ?? overview.budgetOptions[0]
    setEditing({ mode: 'add', category: option?.category ?? '', limit: String(option?.suggested || '') })
  }

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row w-title">
        <div>
          <h1>Budgets</h1>
          <p className="w-title__meta">
            {overview.month.label} · {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left ·{' '}
            <button type="button" className="w-inline-link" onClick={() => !demo && setPaydayOpen(true)} disabled={demo}>{resets}</button>
          </p>
        </div>
        {!demo && (
          <button type="button" className="m-icon-button m-icon-button--glass" aria-label="Add budget" onClick={() => openAdd()}>
            <IconAdd aria-hidden="true" />
          </button>
        )}
      </header>

      {overview.budgets.length > 0 ? (
        <>
          <section className="w-card w-budget-sum" aria-label="All budgets">
            <span className="w-label">Left this month</span>
            <span className="w-big">{whole(Math.max(overview.budgetsLimit - spent, 0))}</span>
            <span className="w-sub">of {whole(overview.budgetsLimit)} · {whole(spent)} spent</span>
            <span className="w-meter w-meter--big" aria-hidden="true">
              <span className={`is-${state}`} style={{ width: `${Math.min(100, (spent / Math.max(overview.budgetsLimit, 1)) * 100)}%` }} />
            </span>
            <span className="w-row-foot">
              <span className={`w-state is-${state}`}>
                {state === 'over' ? 'Over budget' : state === 'fast' ? 'Almost used' : 'Within budget'}
              </span>
            </span>
          </section>

          <AlertsCard />

          <section className="m-section">
            <div className="m-section__head m-section__head--static"><h2>Each month</h2><span className="m-section__count">{overview.budgets.length}</span></div>
            <ul className="m-list m-list--roomy">
              {[...overview.budgets]
                .sort((a, b) => (b.spent / Math.max(b.limit, 1)) - (a.spent / Math.max(a.limit, 1)))
                .map((budget) => (
                  <BudgetRow
                    key={budget.id}
                    budget={budget}
                    currency={overview.currency}
                    state={overview.budgetPace[budget.id]}
                    onClick={demo ? undefined : () => setEditing({ mode: 'edit', category: budget.category, limit: String(budget.limit) })}
                  />
                ))}
            </ul>
          </section>

          {overview.unbudgeted.total > 0 && (
            <section className="w-card w-loose">
              <span className="m-row__main">
                <span className="m-row__title">{whole(overview.unbudgeted.total)} spent with no budget</span>
                <span className="m-row__meta">{overview.unbudgeted.categories.map(categoryLabel).join(', ')}</span>
              </span>
              {!demo && (
                <button type="button" className="m-button" onClick={() => openAdd(overview.unbudgeted.categories[0])}>Add budget</button>
              )}
            </section>
          )}
          {demo && <p className="m-footnote">Example data. Create a workspace to set your own budgets.</p>}
        </>
      ) : (
        <section className="m-empty">
          <h2>Set your first budget</h2>
          <p>Pick a category and how much you want to spend on it each month. Wollie shows if you are on track every day.</p>
          {!demo && (
            <button type="button" className="m-button m-button--primary" onClick={() => openAdd()}>
              Add budget
            </button>
          )}
        </section>
      )}

      <Sheet
        open={editing !== null}
        title={editing?.mode === 'edit' ? categoryLabel(editing.category) : 'New budget'}
        onClose={() => { setEditing(null); setError('') }}
      >
        {editing && (
          <form
            className="m-form"
            onSubmit={(event) => {
              event.preventDefault()
              void run(
                () => saveBudget({ data: { category: editing.category, limit: Number(editing.limit || 0) } }),
                () => setEditing(null),
              )
            }}
          >
            {editing.mode === 'add' && (
              <div className="m-choices" role="radiogroup" aria-label="Category">
                {overview.budgetOptions.map((option) => {
                  const Icon = categoryIcon(option.category)
                  const selected = option.category === editing.category
                  return (
                    <button
                      key={option.category}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`m-choice${selected ? ' is-selected' : ''}`}
                      onClick={() => setEditing({ ...editing, category: option.category, limit: option.suggested ? String(option.suggested) : editing.limit })}
                    >
                      <Icon aria-hidden="true" />
                      <span>{categoryLabel(option.category)}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <label className="m-field">
              <span>Monthly limit</span>
              <input
                inputMode="decimal"
                value={editing.limit}
                onChange={(event) => setEditing({ ...editing, limit: event.target.value.replace(/[^\d.]/g, '') })}
                placeholder="0"
              />
            </label>
            {editing.mode === 'add' && (overview.budgetOptions.find((option) => option.category === editing.category)?.suggested ?? 0) > 0 && (
              <p className="m-hint">Suggested from your last three months.</p>
            )}
            {editing.mode === 'edit' && (() => {
              const budget = overview.budgets.find((item) => item.category === editing.category)
              const last = overview.spending.categories.find((item) => item.category === editing.category)?.lastMonth ?? 0
              return budget ? (
                <p className="m-hint">
                  {whole(budget.spent)} spent so far this month{last > 0 ? `, ${whole(last)} last month` : ''}.
                </p>
              ) : null
            })()}
            {error && <p className="m-error" role="alert">{error}</p>}
            <button type="submit" className="m-button m-button--primary m-button--wide" disabled={busy || !editing.category || !Number(editing.limit)}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            {editing.mode === 'edit' && (
              <button
                type="button"
                className="m-button m-button--danger m-button--wide"
                disabled={busy}
                onClick={() => void run(() => saveBudget({ data: { category: editing.category, limit: 0 } }), () => setEditing(null))}
              >
                Remove budget
              </button>
            )}
          </form>
        )}
      </Sheet>

      <Sheet open={paydayOpen} title="Payday" onClose={() => { setPaydayOpen(false); setError('') }}>
        <form
          className="m-form"
          onSubmit={(event) => {
            event.preventDefault()
            void run(() => setPayday({ data: { day: payday ? Number(payday) : null } }), () => setPaydayOpen(false))
          }}
        >
          <p className="m-hint">
            Budgets reset when your salary arrives.{' '}
            {overview.cycle.source === 'detected' && overview.cycle.paydayDay
              ? `Wollie found your payday on the ${ordinal(overview.cycle.paydayDay)}.`
              : 'Set the day of the month you usually get paid.'}
          </p>
          <label className="m-field">
            <span>Day of the month</span>
            <input
              inputMode="numeric"
              value={payday}
              onChange={(event) => setPaydayValue(event.target.value.replace(/\D/g, '').slice(0, 2))}
              placeholder="1"
            />
          </label>
          {error && <p className="m-error" role="alert">{error}</p>}
          <button type="submit" className="m-button m-button--primary m-button--wide" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          {overview.paydaySetting !== null && (
            <button
              type="button"
              className="m-button m-button--wide"
              disabled={busy}
              onClick={() => void run(() => setPayday({ data: { day: null } }), () => setPaydayOpen(false))}
            >
              Detect automatically
            </button>
          )}
        </form>
      </Sheet>
    </main>
  )
}

function ordinal(day: number) {
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th'
  return `${day}${suffix}`
}
