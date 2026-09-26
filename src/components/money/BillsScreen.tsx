import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  formatMoney,
  type RecurringPayment,
  type TransactionCategoryName,
} from '#/lib/finance-demo'
import { normalizeDate } from '#/lib/money-cycle'
import { updateFinanceRecurringPayment } from '#/server/finance'
import { categoryIcon, categoryLabel, IconAdd, IconCheck, IconClose } from './icons'
import { Sheet } from './Sheet'

export type BillsData = {
  categoryOptions: string[]
  currency: string
  recurringPayments: RecurringPayment[]
}

type Draft = {
  id: string
  merchant: string
  amount: string
  nextDate: string
  cadence: 'monthly' | 'yearly'
  category: string
}

function dueLabel(date: string) {
  const [y, m, d] = normalizeDate(date).split('-').map(Number)
  if (!y) return date
  const due = new Date(y, m - 1, d)
  const today = new Date()
  const days = Math.round((due.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 1 && days < 7) return `Due ${due.toLocaleDateString('en-GB', { weekday: 'long' })}`
  return `Due ${due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}

function toDraft(payment?: RecurringPayment): Draft {
  return {
    id: payment?.id ?? '',
    merchant: payment?.merchant ?? '',
    amount: payment ? String(Math.abs(payment.amount)) : '',
    nextDate: normalizeDate(payment?.nextDate ?? '') || normalizeDate(new Date().toISOString()),
    cadence: payment?.cadence ?? 'monthly',
    category: payment?.category ?? 'Subscriptions',
  }
}

export function BillsScreen({ data, readOnly = false }: { data: BillsData; readOnly?: boolean }) {
  const router = useRouter()
  const money = (value: number) => formatMoney(value, data.currency)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const byDate = (a: RecurringPayment, b: RecurringPayment) =>
    normalizeDate(a.nextDate).localeCompare(normalizeDate(b.nextDate))
  const confirmed = data.recurringPayments.filter((payment) => payment.confirmed !== false).sort(byDate)
  const detected = data.recurringPayments.filter((payment) => payment.confirmed === false).sort(byDate)
  const monthlyTotal = confirmed.reduce(
    (sum, payment) => sum + Math.abs(payment.amount) / (payment.cadence === 'yearly' ? 12 : 1),
    0,
  )

  async function persist(next: Draft, action: 'confirm' | 'save' | 'dismiss') {
    setBusy(next.id || 'new')
    setError('')
    try {
      await updateFinanceRecurringPayment({
        data: {
          id: next.id,
          merchant: next.merchant.trim(),
          amount: Number(next.amount || 0),
          nextDate: next.nextDate,
          cadence: next.cadence,
          category: next.category as TransactionCategoryName,
          action,
        },
      })
      await router.invalidate()
      setDraft(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the bill.')
    } finally {
      setBusy(null)
    }
  }

  const row = (payment: RecurringPayment, suggestion = false) => {
    const Icon = categoryIcon(payment.category)
    const content = (
      <>
        <Icon className="m-row__icon" aria-hidden="true" />
        <span className="m-row__main">
          <span className="m-row__title">{payment.merchant}</span>
          <span className="m-row__meta">
            {payment.cadence === 'yearly' ? 'Yearly' : 'Monthly'} · {dueLabel(payment.nextDate)}
          </span>
        </span>
        <span className="m-row__amount">{money(Math.abs(payment.amount))}</span>
      </>
    )
    return (
      <li key={payment.id}>
        {readOnly || suggestion ? (
          <div className="m-row">{content}</div>
        ) : (
          <button type="button" className="m-row m-row__button m-row__button--flat" onClick={() => setDraft(toDraft(payment))}>
            {content}
          </button>
        )}
        {suggestion && !readOnly && (
          <div className="m-suggestion-actions">
            <button type="button" className="m-chip is-on" disabled={busy !== null} onClick={() => void persist(toDraft(payment), 'confirm')}>
              <IconCheck aria-hidden="true" /> It’s a bill
            </button>
            <button type="button" className="m-chip" disabled={busy !== null} onClick={() => void persist(toDraft(payment), 'dismiss')}>
              <IconClose aria-hidden="true" /> Not a bill
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row">
        <h1>Bills</h1>
        {!readOnly && (
          <button type="button" className="m-icon-button m-icon-button--glass" aria-label="Add bill" onClick={() => setDraft(toDraft())}>
            <IconAdd aria-hidden="true" />
          </button>
        )}
      </header>

      {confirmed.length > 0 && (
        <section className="m-hero m-hero--compact" aria-label="Bills each month">
          <p className="m-hero__label">Each month</p>
          <p className="m-hero__number">{money(Math.round(monthlyTotal))}</p>
          <p className="m-hero__meta">{confirmed.length} {confirmed.length === 1 ? 'bill' : 'bills'}, taken out of safe to spend before they’re due</p>
        </section>
      )}

      {detected.length > 0 && (
        <section className="m-section">
          <div className="m-section__head"><h2>Found by Wollie</h2></div>
          <ul className="m-list m-list--roomy">{detected.map((payment) => row(payment, true))}</ul>
        </section>
      )}

      {confirmed.length > 0 ? (
        <section className="m-section">
          <div className="m-section__head"><h2>Upcoming</h2></div>
          <ul className="m-list">{confirmed.map((payment) => row(payment))}</ul>
        </section>
      ) : (
        <section className="m-empty">
          <h2>No bills yet</h2>
          <p>Wollie spots rent, subscriptions, and other repeating payments from your bank. You can also add one yourself.</p>
        </section>
      )}

      {error && !draft && <p className="m-error" role="alert">{error}</p>}

      <Sheet open={draft !== null} title={draft?.id ? draft.merchant || 'Bill' : 'New bill'} onClose={() => { setDraft(null); setError('') }}>
        {draft && (
          <form
            className="m-form"
            onSubmit={(event) => {
              event.preventDefault()
              void persist(draft, 'save')
            }}
          >
            <label className="m-field">
              <span>Name</span>
              <input value={draft.merchant} onChange={(event) => setDraft({ ...draft, merchant: event.target.value })} placeholder="Rent" maxLength={60} />
            </label>
            <div className="m-field-row">
              <label className="m-field">
                <span>Amount</span>
                <input inputMode="decimal" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
              </label>
              <label className="m-field">
                <span>Next payment</span>
                <input type="date" value={draft.nextDate} onChange={(event) => setDraft({ ...draft, nextDate: event.target.value })} />
              </label>
            </div>
            <div className="m-switch" role="tablist" aria-label="How often" data-second={draft.cadence === 'yearly' || undefined}>
              <button type="button" role="tab" aria-selected={draft.cadence === 'monthly'} onClick={() => setDraft({ ...draft, cadence: 'monthly' })}>Monthly</button>
              <button type="button" role="tab" aria-selected={draft.cadence === 'yearly'} onClick={() => setDraft({ ...draft, cadence: 'yearly' })}>Yearly</button>
            </div>
            <div className="m-choices" role="radiogroup" aria-label="Category">
              {data.categoryOptions.filter((name) => !['Income', 'Transfer'].includes(name)).map((name) => {
                const Icon = categoryIcon(name)
                const selected = name === draft.category
                return (
                  <button key={name} type="button" role="radio" aria-checked={selected} className={`m-choice${selected ? ' is-selected' : ''}`} onClick={() => setDraft({ ...draft, category: name })}>
                    <Icon aria-hidden="true" />
                    <span>{categoryLabel(name)}</span>
                  </button>
                )
              })}
            </div>
            {error && <p className="m-error" role="alert">{error}</p>}
            <button type="submit" className="m-button m-button--primary m-button--wide" disabled={busy !== null || !draft.merchant.trim() || !Number(draft.amount)}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            {draft.id && (
              <button type="button" className="m-button m-button--danger m-button--wide" disabled={busy !== null} onClick={() => void persist(draft, 'dismiss')}>
                Remove bill
              </button>
            )}
          </form>
        )}
      </Sheet>
    </main>
  )
}
