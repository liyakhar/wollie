import { Link } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { loginSearch } from '#/lib/auth-nav'
import { WOLLIE_PLANS } from '#/lib/billing-plans'
import { createCheckoutSession } from '#/server/billing'
import type { BillingAccess } from '#/server/billing.server'

type Interval = 'month' | 'year'

export function PricingPlans({ billing }: { billing: BillingAccess | null }) {
  const { free, household } = WOLLIE_PLANS
  const [interval, setInterval] = useState<Interval>('year')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const earlyAccess = !billing || billing.billingMode === 'early_access'
  const subscribed = billing?.state === 'subscribed' || billing?.state === 'founder'
  const canCheckout = Boolean(billing?.paidPlansEnabled) && !subscribed && billing?.isHouseholdOwner !== false
  const yearlyMonthly = (household.yearlyPrice / 12).toFixed(2)
  const savePercent = Math.round((1 - household.yearlyPrice / (household.monthlyPrice * 12)) * 100)

  const startCheckout = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await createCheckoutSession({ data: { interval } })
      window.location.assign(result.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout could not be opened.')
      setLoading(false)
    }
  }

  const freeCta = billing
    ? <Link to="/app" className="ds-btn ds-btn--lg">Open Wollie</Link>
    : <Link to="/login" search={loginSearch({ signup: true })} className="ds-btn ds-btn--lg">Start free <ArrowRight aria-hidden="true" /></Link>

  let householdCta: React.ReactNode
  if (subscribed) {
    householdCta = <Link to="/app/billing" className="ds-btn ds-btn--primary ds-btn--lg">Manage plan</Link>
  } else if (canCheckout) {
    householdCta = (
      <button type="button" className="ds-btn ds-btn--primary ds-btn--lg" onClick={() => void startCheckout()} disabled={loading}>
        {loading ? 'Opening checkout…' : 'Choose Household'} <ArrowRight aria-hidden="true" />
      </button>
    )
  } else if (billing) {
    householdCta = <Link to="/app" className="ds-btn ds-btn--primary ds-btn--lg">Open Wollie</Link>
  } else {
    householdCta = <Link to="/login" search={loginSearch({ signup: true })} className="ds-btn ds-btn--primary ds-btn--lg">{earlyAccess ? 'Start free' : 'Get Household'} <ArrowRight aria-hidden="true" /></Link>
  }

  return (
    <div className="site-pricing">
      <div className="site-toggle" role="group" aria-label="Billing period">
        <button type="button" aria-pressed={interval === 'month'} onClick={() => setInterval('month')}>Monthly</button>
        <button type="button" aria-pressed={interval === 'year'} onClick={() => setInterval('year')}>
          Yearly <span className="site-toggle__save">Save {savePercent}%</span>
        </button>
      </div>

      <div className="site-plans">
        <section className="site-plan" aria-labelledby="plan-free">
          <h2 id="plan-free" className="site-plan__name">{free.name}</h2>
          <p className="site-plan__price">€0</p>
          <p className="site-plan__sub">{free.description}</p>
          <ul className="site-plan__list">
            <li><Check aria-hidden="true" />Up to {free.limits.bankConnections} bank connections</li>
            <li><Check aria-hidden="true" />Up to {free.limits.budgetEnvelopes} budget categories</li>
            <li><Check aria-hidden="true" />Savings goals</li>
            <li><Check aria-hidden="true" />Invite your partner</li>
          </ul>
          <div className="site-plan__cta">{freeCta}</div>
        </section>

        <section className="site-plan site-plan--featured" aria-labelledby="plan-household">
          <h2 id="plan-household" className="site-plan__name">
            {household.name}
            {earlyAccess && <span className="site-plan__tag">Free for now</span>}
          </h2>
          <p className="site-plan__price">
            {interval === 'year' ? `€${yearlyMonthly}` : `€${household.monthlyPrice}`}<span> / month</span>
          </p>
          <p className="site-plan__sub">
            {interval === 'year' ? `Billed €${household.yearlyPrice} once a year` : 'Billed monthly. Cancel any time.'}
          </p>
          <ul className="site-plan__list">
            <li><Check aria-hidden="true" />Everything in Free</li>
            <li><Check aria-hidden="true" />Unlimited bank connections</li>
            <li><Check aria-hidden="true" />Unlimited budget categories</li>
            <li><Check aria-hidden="true" />Backup and restore</li>
          </ul>
          <div className="site-plan__cta">{householdCta}</div>
          {error && <p className="site-plan__error" role="alert">{error}</p>}
        </section>
      </div>

      <p className="site-pricing-note">
        {earlyAccess
          ? 'Everything is free during early access. We will tell you before that changes.'
          : 'Prices include no hidden fees. Cancel in two clicks from your billing page.'}
      </p>
    </div>
  )
}
