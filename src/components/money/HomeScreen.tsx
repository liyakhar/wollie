import { Link } from '@tanstack/react-router'
import { IconChevronRight } from './icons'
import { ProfileButton } from '#/components/ProfileButton'
import { formatMoney } from '#/lib/finance-demo'
import type { MoneyOverview } from '#/lib/money-overview'
import { categoryIcon, categoryLabel, goalIcon } from './icons'

function dueLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const due = new Date(y, m - 1, d)
  const today = new Date()
  const days = Math.round(
    (due.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000,
  )
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return due.toLocaleDateString('en-GB', { weekday: 'long' })
  return due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function paydayLabel(overview: MoneyOverview) {
  const [y, m, d] = overview.cycle.end.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function ConnectBank() {
  const steps = [
    { to: '/app/accounts', title: 'Connect your bank', body: 'Read-only. Wollie never sees your bank password.', primary: true },
    { to: '/app/budgets', title: 'Set a budget', body: 'Pick what you want to spend each month.', primary: false },
    { to: '/app/goals', title: 'Add a goal', body: 'A trip, a safety cushion, your pension.', primary: false },
  ] as const

  return (
    <main id="main" className="m-screen m-setup">
      <header className="m-setup__head">
        <p className="m-setup__kicker">Get set up</p>
        <h1>Three steps to your number.</h1>
        <p>Do them in any order. Connecting your bank is what makes the numbers real.</p>
      </header>
      <ol className="m-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Link to={step.to} className={`m-step${step.primary ? ' m-step--primary' : ''}`}>
              <span className="m-step__num" aria-hidden="true">{index + 1}</span>
              <span className="m-step__text">
                <span className="m-step__title">{step.title}</span>
                <span className="m-step__body">{step.body}</span>
              </span>
              <IconChevronRight className="m-step__chevron" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
      <p className="m-footnote">0 of 3 done</p>
    </main>
  )
}

export function HomeScreen({ overview, demo = false }: { overview: MoneyOverview; demo?: boolean }) {
  if (!overview.hasAccounts) return <ConnectBank />

  const { currency } = overview
  const money = (value: number) => formatMoney(value, currency)
  const tightest = [...overview.budgets].sort((a, b) => a.leftShare - b.leftShare).slice(0, 2)
  const goalsToDo = overview.goals.filter((goal) => goal.due > 0)
  const goalsShown = (goalsToDo.length ? goalsToDo : overview.goals).slice(0, 2)
  const base = '/app'

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row">
        <h1>Home</h1>
        <ProfileButton demo={demo} />
      </header>

      <section className="m-balance" aria-label="Safe to spend">
        <p className="m-balance__label">Safe to spend</p>
        <p className="m-balance__number">
          <SplitMoney value={Math.max(overview.safeToSpend, 0)} currency={currency} />
        </p>
        <div className="m-balance__chips">
          <span className="m-glass-chip">{money(overview.perDay)} a day</span>
          <span className="m-glass-chip">
            {overview.cycle.daysLeft} {overview.cycle.daysLeft === 1 ? 'day' : 'days'} to payday
          </span>
        </div>
      </section>

      {overview.short > 0 && (
        <Link to={`${base}/budgets`} className="m-alert">
          <span>
            <strong>{money(overview.short)} short</strong> before payday
          </span>
          <span className="m-alert__action">Fix</span>
        </Link>
      )}

      {overview.reviewCount > 0 && (
        <Link to={`${base}/transactions`} className="m-row m-row--link">
          <span className="m-dot" aria-hidden="true" />
          <span className="m-row__main">
            {overview.reviewCount} {overview.reviewCount === 1 ? 'transaction needs' : 'transactions need'} a category
          </span>
          <IconChevronRight className="m-row__chevron" aria-hidden="true" />
        </Link>
      )}

      {overview.bills.length > 0 && (
        <section className="m-section">
          <Link to="/app/recurring" className="m-section__head">
            <h2>Up next</h2>
            <IconChevronRight aria-hidden="true" />
          </Link>
          <ul className="m-list">
            {overview.bills.slice(0, 3).map((bill) => {
              const Icon = categoryIcon(bill.category)
              return (
                <li key={bill.id} className="m-row">
                  <Icon className="m-row__icon" aria-hidden="true" />
                  <span className="m-row__main">
                    <span className="m-row__title">{bill.name}</span>
                    <span className="m-row__meta">{dueLabel(bill.date)}</span>
                  </span>
                  <span className="m-row__amount">{money(bill.amount)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {tightest.length > 0 && (
        <section className="m-section">
          <Link to={`${base}/budgets`} className="m-section__head">
            <h2>Budgets</h2>
            <IconChevronRight aria-hidden="true" />
          </Link>
          <ul className="m-list">
            {tightest.map((budget) => <BudgetRow key={budget.id} budget={budget} currency={currency} />)}
          </ul>
        </section>
      )}

      {goalsShown.length > 0 && (
        <section className="m-section">
          <Link to={`${base}/goals`} className="m-section__head">
            <h2>Goals</h2>
            <IconChevronRight aria-hidden="true" />
          </Link>
          <ul className="m-list">
            {goalsShown.map((goal) => {
              const Icon = goalIcon(goal.icon)
              return (
                <li key={goal.id} className="m-row m-row--stack">
                  <Icon className="m-row__icon" aria-hidden="true" />
                  <span className="m-row__main">
                    <span className="m-row__line">
                      <span className="m-row__title">{goal.name}</span>
                      <span className="m-row__value">
                        {goal.due > 0 ? <span className="m-accent">{money(goal.due)} to save</span> : 'Saved this month'}
                      </span>
                    </span>
                    {goal.share !== null && <Bar share={goal.share} />}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {overview.budgets.length === 0 && overview.goals.length === 0 && (
        <section className="m-empty">
          <p>Set a budget or a savings goal to see them here.</p>
          <div className="m-empty__actions">
            <Link to={`${base}/budgets`} className="m-button">Add budget</Link>
            <Link to={`${base}/goals`} className="m-button">Add goal</Link>
          </div>
        </section>
      )}
    </main>
  )
}

/** Whole units large, cents small: "€2,357" + ".82". */
export function SplitMoney({ value, currency }: { value: number; currency: string }) {
  const text = formatMoney(value, currency)
  const match = text.match(/^(.*?)([.,]\d{2})$/)
  if (!match) return <>{text}</>
  return <>{match[1]}<span className="m-cents">{match[2]}</span></>
}

export function Bar({ share, state = 'ok' }: { share: number; state?: 'ok' | 'low' | 'over' }) {
  return (
    <span className={`m-bar is-${state}`} aria-hidden="true">
      <span style={{ transform: `scaleX(${Math.max(share, 0)})` }} />
    </span>
  )
}

export function BudgetRow({
  budget,
  currency,
  onClick,
}: {
  budget: MoneyOverview['budgets'][number]
  currency: string
  onClick?: () => void
}) {
  const Icon = categoryIcon(budget.category)
  const content = (
    <>
      <Icon className="m-row__icon" aria-hidden="true" />
      <span className="m-row__main">
        <span className="m-row__line">
          <span className="m-row__title">{categoryLabel(budget.category)}</span>
          <span className={`m-row__value${budget.state === 'over' ? ' is-negative' : ''}`}>
            {budget.state === 'over'
              ? `${formatMoney(-budget.left, currency)} over`
              : <>{formatMoney(budget.left, currency)} <span className="m-quiet">left of {formatMoney(budget.limit, currency)}</span></>}
          </span>
        </span>
        <Bar share={budget.state === 'over' ? 1 : budget.leftShare} state={budget.state} />
      </span>
    </>
  )
  return (
    <li className="m-row m-row--stack">
      {onClick ? (
        <button type="button" className="m-row__button" onClick={onClick}>{content}</button>
      ) : content}
    </li>
  )
}
