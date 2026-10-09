import { Link } from '@tanstack/react-router'
import { IconCheck, IconChevronRight } from './icons'
import { ProfileButton } from '#/components/ProfileButton'
import { formatMoney } from '#/lib/finance-demo'
import { paceState } from '#/lib/money-insights'
import type { MoneyOverview } from '#/lib/money-overview'
import { categoryIcon, categoryLabel } from './icons'
import { PaceChart, PaceDot, ShareBar, chartColor } from './charts'

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

/** Money without cents: "€2,431". */
export function wholeMoney(value: number, currency: string) {
  return formatMoney(Math.round(value), currency).replace(/[.,]00$/, '')
}

/** First run: what is left to set up, with real progress. */
export function ConnectBank({ overview }: { overview?: MoneyOverview }) {
  const steps = [
    { to: '/app/accounts', title: 'Connect your bank', body: 'Read-only. Wollie never sees your bank password.', done: Boolean(overview?.hasAccounts) },
    { to: '/app/budgets', title: 'Set monthly budgets', body: 'Groceries, eating out, shopping. Wollie suggests amounts.', done: Boolean(overview?.budgets.length) },
    { to: '/app/goals', title: 'Start saving for something', body: 'A home, a trip, a cushion. Pick an amount for each month.', done: Boolean(overview?.goals.length) },
    { to: '/app/household', title: 'Add your partner', body: 'Optional. Each of you keeps your own bank and login.', done: (overview?.members.length ?? 0) > 1 },
  ]
  const doneCount = steps.filter((step) => step.done).length
  const next = steps.findIndex((step) => !step.done)

  return (
    <main id="main" className="m-screen m-setup">
      <header className="m-setup__head">
        <p className="m-setup__kicker">Get set up · {doneCount} of {steps.length}</p>
        <h1>See every euro, every month.</h1>
        <p>Connect your bank first. Then tell Wollie what you want to spend and save.</p>
      </header>
      <ol className="m-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Link to={step.to} className={`m-step${next === index ? ' m-step--primary' : ''}${step.done ? ' is-done' : ''}`}>
              <span className="m-step__num" aria-hidden="true">{step.done ? <IconCheck /> : index + 1}</span>
              <span className="m-step__text">
                <span className="m-step__title">{step.title}</span>
                <span className="m-step__body">{step.done ? 'Done' : step.body}</span>
              </span>
              <IconChevronRight className="m-step__chevron" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </main>
  )
}

export function Avatars({ members }: { members: MoneyOverview['members'] }) {
  if (members.length < 2) return null
  return (
    <Link to="/app/household" className="w-avatars" aria-label={`Household: ${members.map((member) => member.name).join(' and ')}`}>
      {members.slice(0, 3).map((member) => (
        <span key={member.id} className={`w-avatar${member.you ? ' is-you' : ''}`} aria-hidden="true">{member.initial}</span>
      ))}
    </Link>
  )
}

export function HomeScreen({ overview, demo = false }: { overview: MoneyOverview; demo?: boolean }) {
  if (!overview.hasAccounts) return <ConnectBank overview={overview} />

  const { currency, spending, month } = overview
  const money = (value: number) => formatMoney(value, currency)
  const whole = (value: number) => wholeMoney(value, currency)
  const lastLabel = spending.history.at(-2)?.label ?? 'last month'
  const diff = spending.total - spending.lastMonthByNow
  const daysLeft = Math.max(month.days - month.elapsed, 0)
  const partner = overview.members.find((member) => !member.you)

  const budgetSpent = overview.budgets.reduce((sum, budget) => sum + budget.spent, 0)
  const budgetState = paceState(budgetSpent, overview.budgetsLimit, month.pace)
  const over = overview.budgets.filter((budget) => budget.state === 'over')
  const goalsToMove = overview.goals.filter((goal) => goal.due > 0)

  const top = spending.categories.filter((item) => item.total > 0)
  const shown = top.slice(0, 4)
  const rest = top.slice(4).reduce((sum, item) => sum + item.total, 0)
  const shareSegments = [
    ...shown.map((item, index) => ({ value: item.total, color: chartColor(index) })),
    ...(rest > 0 ? [{ value: rest, color: '#e4e4dd' }] : []),
  ]

  return (
    <main id="main" className="m-screen w-home">
      <header className="m-title-row w-title">
        <div>
          <h1>{month.label}</h1>
          <p className="w-title__meta">
            {daysLeft === 0 ? 'Last day of the month' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to go`}
            {partner ? ` · with ${partner.name}` : ''}
          </p>
        </div>
        <ProfileButton demo={demo} />
      </header>

      {/* 1. How much did we spend? */}
      <Link to="/app/transactions" className="w-card w-spent">
        <span className="w-label">Everyday spending</span>
        <span className="w-big">{whole(spending.total)}</span>
        {spending.lastMonthTotal > 0 && (
          <span className={`w-delta ${diff <= 0 ? 'is-good' : 'is-up'}`}>
            {diff <= 0 ? '↓' : '↑'} {whole(Math.abs(diff))} {diff <= 0 ? 'less' : 'more'} than {lastLabel} by now
          </span>
        )}
        <span className="w-pace-wrap">
          <PaceChart daily={spending.daily} lastDaily={spending.lastDaily} days={spending.days} />
          <PaceDot daily={spending.daily} lastDaily={spending.lastDaily} days={spending.days} />
        </span>
        <span className="w-legend">
          <span><i className="w-key w-key--now" /> {month.label}</span>
          <span><i className="w-key w-key--last" /> {lastLabel}</span>
        </span>
        {overview.fixed.total > 0 && (
          <span className="w-fixed-line">
            <span>Rent and bills</span>
            <strong>{whole(overview.fixed.total)}</strong>
          </span>
        )}
      </Link>

      {/* 2. Within budget? Saved? */}
      <div className="w-tiles">
        <Link to="/app/budgets" className="w-card w-tile">
          <span className="w-label">Budgets</span>
          {overview.budgets.length ? (
            <>
              <span className="w-mid">{whole(Math.max(overview.budgetsLimit - budgetSpent, 0))}</span>
              <span className="w-sub">left of {whole(overview.budgetsLimit)}</span>
              <span className="w-meter" aria-hidden="true">
                <span className={`is-${budgetState}`} style={{ width: `${Math.min(100, (budgetSpent / Math.max(overview.budgetsLimit, 1)) * 100)}%` }} />
              </span>
              <span className={`w-state is-${budgetState}`}>
                {budgetState === 'over' ? 'Over budget' : budgetState === 'fast' ? 'Almost used' : 'Within budget'}
              </span>
            </>
          ) : (
            <span className="w-sub w-sub--cta">Set your first budget</span>
          )}
        </Link>
        <Link to="/app/goals" className="w-card w-tile">
          <span className="w-label">Saved</span>
          {overview.goals.length ? (
            <>
              <span className="w-mid">{whole(overview.savings.done)}</span>
              <span className="w-sub">of {whole(overview.savings.planned)} this month</span>
              <span className="w-meter" aria-hidden="true">
                <span className="is-saved" style={{ width: `${Math.min(100, (overview.savings.done / Math.max(overview.savings.planned, 1)) * 100)}%` }} />
              </span>
              <span className={`w-state ${goalsToMove.length ? 'is-fast' : 'is-on-track'}`}>
                {goalsToMove.length ? `${goalsToMove.length} to move` : 'All set aside'}
              </span>
            </>
          ) : (
            <span className="w-sub w-sub--cta">Start saving for something</span>
          )}
        </Link>
      </div>

      {/* 3. Anything to do? */}
      <section className="m-section" aria-label="Needs you">
        <div className="m-section__head m-section__head--static"><h2>Needs you</h2></div>
        <ul className="m-list w-todo">
          {over.map((budget) => {
            const Icon = categoryIcon(budget.category)
            return (
              <li key={budget.id}>
                <Link to="/app/budgets" className="m-row m-row--link">
                  <Icon className="m-row__icon w-icon--alert" aria-hidden="true" />
                  <span className="m-row__main">
                    <span className="m-row__title">{categoryLabel(budget.category)} is over budget</span>
                    <span className="m-row__meta">{money(-budget.left)} over · {whole(budget.limit)} a month</span>
                  </span>
                  <IconChevronRight className="m-row__chevron" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
          {goalsToMove.map((goal) => (
            <li key={goal.id}>
              <Link to="/app/goals" className="m-row m-row--link">
                <span className="m-row__icon w-icon--neon" aria-hidden="true">€</span>
                <span className="m-row__main">
                  <span className="m-row__title">Move {whole(goal.due)} to {goal.name}</span>
                  <span className="m-row__meta">Wollie ticks it when it lands in savings</span>
                </span>
                <IconChevronRight className="m-row__chevron" aria-hidden="true" />
              </Link>
            </li>
          ))}
          {overview.reviewCount > 0 && (
            <li>
              <Link to="/app/transactions" className="m-row m-row--link">
                <span className="m-row__icon" aria-hidden="true">?</span>
                <span className="m-row__main">
                  <span className="m-row__title">
                    {overview.reviewCount} {overview.reviewCount === 1 ? 'payment needs' : 'payments need'} a category
                  </span>
                </span>
                <IconChevronRight className="m-row__chevron" aria-hidden="true" />
              </Link>
            </li>
          )}
          {!over.length && !goalsToMove.length && overview.reviewCount === 0 && (
            <li className="m-row w-calm">
              <span className="m-row__icon w-icon--neon" aria-hidden="true"><IconCheck /></span>
              <span className="m-row__main">
                <span className="m-row__title">All good</span>
                <span className="m-row__meta">Within budget, and this month's saving is done.</span>
              </span>
            </li>
          )}
        </ul>
      </section>

      {/* 4. Where did it go? */}
      {top.length > 0 && (
        <section className="m-section">
          <Link to="/app/transactions" className="m-section__head">
            <h2>Where it went</h2>
            <IconChevronRight aria-hidden="true" />
          </Link>
          <ShareBar segments={shareSegments} />
          <ul className="m-list w-cats">
            {shown.map((item, index) => (
              <li key={item.category} className="m-row">
                <span className="w-swatch" style={{ background: chartColor(index) }} aria-hidden="true" />
                <span className="m-row__main">
                  <span className="m-row__title">{categoryLabel(item.category)}</span>
                </span>
                <span className="w-cats__share">{Math.round(item.share * 100)}%</span>
                <span className="m-row__amount">{whole(item.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. What's coming? */}
      {overview.bills.length > 0 && (
        <section className="m-section">
          <Link to="/app/recurring" className="m-section__head">
            <h2>Coming up</h2>
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

/** A budget: spent so far against the limit. */
export function BudgetRow({
  budget,
  currency,
  state,
  onClick,
}: {
  budget: MoneyOverview['budgets'][number]
  currency: string
  state?: 'on-track' | 'fast' | 'over'
  onClick?: () => void
}) {
  const Icon = categoryIcon(budget.category)
  const status = state ?? (budget.state === 'over' ? 'over' : 'on-track')
  const words = { 'on-track': 'Within budget', fast: 'Almost used', over: 'Over budget' } as const
  const content = (
    <>
      <Icon className="m-row__icon" aria-hidden="true" />
      <span className="m-row__main">
        <span className="m-row__line">
          <span className="m-row__title">{categoryLabel(budget.category)}</span>
          <span className={`m-row__value${budget.state === 'over' ? ' is-negative' : ''}`}>
            {budget.state === 'over'
              ? `${formatMoney(-budget.left, currency)} over`
              : <>{formatMoney(budget.left, currency)} <span className="m-quiet">left</span></>}
          </span>
        </span>
        <span className="w-meter w-meter--row" aria-hidden="true">
          <span className={`is-${status}`} style={{ width: `${Math.min(100, (budget.spent / Math.max(budget.limit, 1)) * 100)}%` }} />
        </span>
        <span className="m-row__line w-row-foot">
          <span className={`w-state is-${status}`}>{words[status]}</span>
          <span className="m-quiet">{wholeMoney(budget.spent, currency)} of {wholeMoney(budget.limit, currency)}</span>
        </span>
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
