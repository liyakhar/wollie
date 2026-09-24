import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { formatMoney } from '#/lib/finance-demo'
import type { MoneyOverview } from '#/lib/money-overview'
import { saveBudget, setPayday } from '#/server/money'
import { BudgetRow, paydayLabel } from './HomeScreen'
import { categoryIcon, categoryLabel, ICON_STROKE } from './icons'
import { Sheet } from './Sheet'

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
  const money = (value: number) => formatMoney(value, overview.currency)

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
    ? `Resets on ${paydayLabel(overview)}`
    : `Resets on payday, ${paydayLabel(overview)}`

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row">
        <h1>Budgets</h1>
        {!demo && (
          <button
            type="button"
            className="m-icon-button m-icon-button--glass"
            aria-label="Add budget"
            onClick={() => setEditing({ mode: 'add', category: overview.budgetOptions[0]?.category ?? '', limit: String(overview.budgetOptions[0]?.suggested || '') })}
          >
            <Plus aria-hidden="true" strokeWidth={1.75} />
          </button>
        )}
      </header>

      {overview.budgets.length > 0 ? (
        <>
          <section className="m-summary">
            <p className="m-summary__number">
              {money(overview.budgetsLeft)} <span>left of {money(overview.budgetsLimit)}</span>
            </p>
            <button type="button" className="m-link" onClick={() => !demo && setPaydayOpen(true)} disabled={demo}>
              {resets}
            </button>
          </section>

          {overview.short > 0 && (
            <p className="m-alert m-alert--static">
              <span>
                <strong>{money(overview.short)} short</strong> before payday. Lower a budget or skip a goal this month.
              </span>
            </p>
          )}

          <ul className="m-list m-list--roomy">
            {overview.budgets.map((budget) => (
              <BudgetRow
                key={budget.id}
                budget={budget}
                currency={overview.currency}
                onClick={demo ? undefined : () => setEditing({ mode: 'edit', category: budget.category, limit: String(budget.limit) })}
              />
            ))}
          </ul>
        </>
      ) : (
        <section className="m-empty">
          <h2>Set your first budget</h2>
          <p>Pick a category and how much you want to spend on it each month. Wollie tracks what’s left.</p>
          {!demo && (
            <button
              type="button"
              className="m-button m-button--primary"
              onClick={() => setEditing({ mode: 'add', category: overview.budgetOptions[0]?.category ?? '', limit: String(overview.budgetOptions[0]?.suggested || '') })}
            >
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
                      <Icon aria-hidden="true" strokeWidth={ICON_STROKE} />
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
