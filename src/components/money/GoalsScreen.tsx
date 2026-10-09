import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { IconCheck, IconAdd } from './icons'
import { formatMoney } from '#/lib/finance-demo'
import type { MoneyOverview } from '#/lib/money-overview'
import { archiveGoal, recordGoalCycle, saveGoal } from '#/server/money'
import { Bar, wholeMoney } from './HomeScreen'
import { MonthDots } from './charts'
import { GOAL_ICON_OPTIONS, goalIcon } from './icons'
import { Sheet } from './Sheet'

type Goal = MoneyOverview['goals'][number]

type Draft = {
  id?: string
  name: string
  icon: string
  target: string
  targetDate: string
  monthly: string
  starting: string
}

const EMPTY_DRAFT: Draft = { name: '', icon: 'target', target: '', targetDate: '', monthly: '', starting: '' }

function monthsUntil(date: string) {
  const [y, m] = date.split('-').map(Number)
  const now = new Date()
  return Math.max((y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()), 1)
}

export function GoalsScreen({ overview, demo = false }: { overview: MoneyOverview; demo?: boolean }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [active, setActive] = useState<Goal | null>(null)
  const [amount, setAmount] = useState('')
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

  // Suggest a monthly amount when a target and a date are set.
  const suggestedMonthly = draft && Number(draft.target) > 0 && draft.targetDate
    ? Math.ceil(Math.max(Number(draft.target) - Number(draft.starting || 0), 0) / monthsUntil(draft.targetDate))
    : 0

  const whole = (value: number) => wholeMoney(value, overview.currency)
  const { savings } = overview

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row">
        <h1>Savings</h1>
        {!demo && (
          <button type="button" className="m-icon-button m-icon-button--glass" aria-label="Add goal" onClick={() => setDraft(EMPTY_DRAFT)}>
            <IconAdd aria-hidden="true" />
          </button>
        )}
      </header>

      {overview.goals.length > 0 ? (
        <>
          <section className="w-card w-save-hero" aria-label="Saved">
            <span className="w-label">Saved so far</span>
            <span className="w-big">{whole(savings.totalSaved)}</span>
            <span className="w-save-hero__month">
              <span>{overview.month.label}</span>
              <strong>{whole(savings.done)} of {whole(savings.planned)}</strong>
            </span>
            <span className="w-meter w-meter--ink" aria-hidden="true">
              <span style={{ width: `${Math.min(100, (savings.done / Math.max(savings.planned, 1)) * 100)}%` }} />
            </span>
          </section>
          <p className="w-howto">On payday, move money to your savings account. Wollie sees it arrive and ticks your goals, in order.</p>

          <ul className="w-goals">
            {overview.goals.map((goal) => {
              const Icon = goalIcon(goal.icon)
              const content = (
                <>
                  <span className="w-goal__head">
                    <Icon className="m-row__icon" aria-hidden="true" />
                    <span className="w-goal__name">{goal.name}</span>
                    <span className="w-goal__monthly">{whole(goal.monthly)}<span className="m-quiet"> / month</span></span>
                  </span>
                  <span className="w-goal__amount">
                    <strong>{whole(goal.saved)}</strong>
                    {goal.target !== null && <span className="m-quiet"> of {whole(goal.target)}</span>}
                    {goal.share !== null && <span className="w-goal__pct">{Math.round(goal.share * 100)}%</span>}
                  </span>
                  {goal.share !== null && <Bar share={goal.share} />}
                  <span className="w-goal__foot">
                    <GoalStatus goal={goal} money={whole} />
                    {goal.reached ? null : goal.finish ? (
                      <span className="m-quiet">Done by {goal.finish}</span>
                    ) : goal.target === null ? (
                      <span className="m-quiet">No end date</span>
                    ) : null}
                  </span>
                  {goal.months.length > 0 && <MonthDots months={goal.months} />}
                </>
              )
              return (
                <li key={goal.id} className="w-card w-goal">
                  {demo ? content : (
                    <button type="button" className="w-goal__button" onClick={() => { setActive(goal); setAmount(String(goal.due || goal.monthly || '')) }}>
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      ) : (
        <section className="m-empty">
          <h2>Save a little every month</h2>
          <p>A home, a trip, a safety cushion. Pick an amount for each month. When you move it to savings on payday, Wollie ticks it off.</p>
          {!demo && (
            <button type="button" className="m-button m-button--primary" onClick={() => setDraft(EMPTY_DRAFT)}>
              Add a goal
            </button>
          )}
        </section>
      )}

      {/* This month for one goal */}
      <Sheet open={active !== null} title={active?.name ?? ''} onClose={() => { setActive(null); setError('') }}>
        {active && (
          <div className="m-form">
            {active.reached ? (
              <p className="m-hint">You reached this goal.</p>
            ) : active.doneThisCycle ? (
              <p className="m-hint">
                {active.thisMonth.auto ? 'Wollie saw ' : 'You saved '}{money(active.savedThisCycle)}{active.thisMonth.auto ? ' move to savings this month.' : ' this month.'}
              </p>
            ) : active.skippedThisCycle ? (
              <p className="m-hint">You skipped this month.</p>
            ) : (
              <>
                <p className="m-hint">Wollie ticks this by itself when it sees money move to your savings. Moved it another way? Mark it here.</p>
                <label className="m-field">
                  <span>Saved this month</span>
                  <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))} />
                </label>
              </>
            )}
            {error && <p className="m-error" role="alert">{error}</p>}
            {!active.reached && !active.doneThisCycle && !active.skippedThisCycle && (
              <>
                <button
                  type="button"
                  className="m-button m-button--primary m-button--wide"
                  disabled={busy || !Number(amount)}
                  onClick={() => void run(() => recordGoalCycle({ data: { goalId: active.id, action: 'saved', amount: Number(amount) } }), () => setActive(null))}
                >
                  Mark as saved
                </button>
                <button
                  type="button"
                  className="m-button m-button--wide"
                  disabled={busy}
                  onClick={() => void run(() => recordGoalCycle({ data: { goalId: active.id, action: 'skip' } }), () => setActive(null))}
                >
                  Skip this month
                </button>
              </>
            )}
            {(active.doneThisCycle || active.skippedThisCycle) && (
              <button
                type="button"
                className="m-button m-button--wide"
                disabled={busy}
                onClick={() => void run(() => recordGoalCycle({ data: { goalId: active.id, action: 'undo' } }), () => setActive(null))}
              >
                Undo
              </button>
            )}
            <button
              type="button"
              className="m-link m-link--center"
              onClick={() => {
                setDraft({
                  id: active.id,
                  name: active.name,
                  icon: active.icon,
                  target: active.target === null ? '' : String(active.target),
                  targetDate: active.targetDate ?? '',
                  monthly: String(active.monthly || ''),
                  starting: '',
                })
                setActive(null)
              }}
            >
              Edit goal
            </button>
          </div>
        )}
      </Sheet>

      {/* New or edit */}
      <Sheet open={draft !== null} title={draft?.id ? 'Edit goal' : 'New goal'} onClose={() => { setDraft(null); setError('') }}>
        {draft && (
          <form
            className="m-form"
            onSubmit={(event) => {
              event.preventDefault()
              void run(
                () => saveGoal({
                  data: {
                    id: draft.id,
                    name: draft.name,
                    icon: draft.icon,
                    target: draft.target ? Number(draft.target) : null,
                    targetDate: draft.targetDate || null,
                    monthly: Number(draft.monthly || suggestedMonthly || 0),
                    ...(draft.id ? {} : { starting: Number(draft.starting || 0) }),
                  },
                }),
                () => setDraft(null),
              )
            }}
          >
            <label className="m-field">
              <span>Name</span>
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Travel" maxLength={60} />
            </label>
            <div className="m-choices m-choices--icons" role="radiogroup" aria-label="Icon">
              {GOAL_ICON_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.icon === option.id}
                  aria-label={option.label}
                  className={`m-choice m-choice--icon${draft.icon === option.id ? ' is-selected' : ''}`}
                  onClick={() => setDraft({ ...draft, icon: option.id })}
                >
                  <option.icon aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="m-field-row">
              <label className="m-field">
                <span>Target <em>optional</em></span>
                <input inputMode="decimal" value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value.replace(/[^\d.]/g, '') })} placeholder="3000" />
              </label>
              <label className="m-field">
                <span>By <em>optional</em></span>
                <input type="date" value={draft.targetDate} onChange={(event) => setDraft({ ...draft, targetDate: event.target.value })} />
              </label>
            </div>
            <label className="m-field">
              <span>Each month</span>
              <input
                inputMode="decimal"
                value={draft.monthly}
                onChange={(event) => setDraft({ ...draft, monthly: event.target.value.replace(/[^\d.]/g, '') })}
                placeholder={suggestedMonthly ? String(suggestedMonthly) : '200'}
              />
            </label>
            {suggestedMonthly > 0 && !draft.monthly && (
              <p className="m-hint">{money(suggestedMonthly)} a month reaches the target on time.</p>
            )}
            <p className="m-hint">On payday, move this amount to your savings account. Wollie sees it and ticks the month off.</p>
            {!draft.id && (
              <label className="m-field">
                <span>Already saved <em>optional</em></span>
                <input inputMode="decimal" value={draft.starting} onChange={(event) => setDraft({ ...draft, starting: event.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
              </label>
            )}
            {error && <p className="m-error" role="alert">{error}</p>}
            <button type="submit" className="m-button m-button--primary m-button--wide" disabled={busy || !draft.name.trim()}>
              {busy ? 'Saving…' : 'Save goal'}
            </button>
            {draft.id && (
              <button
                type="button"
                className="m-button m-button--danger m-button--wide"
                disabled={busy}
                onClick={() => void run(() => archiveGoal({ data: { id: draft.id! } }), () => setDraft(null))}
              >
                Remove goal
              </button>
            )}
          </form>
        )}
      </Sheet>
    </main>
  )
}

function GoalStatus({ goal, money }: { goal: Goal; money: (value: number) => string }) {
  if (goal.reached) return <span className="w-state is-on-track">Goal reached</span>
  if (goal.skippedThisCycle) return <span className="w-state is-skip">Skipped this month</span>
  if (goal.due > 0) {
    return <span className="w-state is-fast">{goal.savedThisCycle > 0 ? `${money(goal.due)} more to move` : `${money(goal.due)} to move`}</span>
  }
  if (goal.monthly > 0) {
    return (
      <span className="w-state is-on-track">
        <IconCheck aria-hidden="true" className="m-inline-icon" /> {goal.thisMonth.auto ? 'Moved this month' : 'Saved this month'}
      </span>
    )
  }
  return null
}
