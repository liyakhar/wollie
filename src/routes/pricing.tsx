import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'
import { SitePage, SiteHead } from '#/components/SitePage'
import { loginSearch } from '#/lib/auth-nav'
import { WOLLIE_PLANS } from '#/lib/billing-plans'
import { buildPageMeta } from '#/lib/seo'
import { getBillingOverview } from '#/server/billing'

const pricingMeta = buildPageMeta({
  path: '/pricing',
  title: 'Pricing',
  description: 'Wollie is free to start. Household is €7.99 a month or €59 a year, and free during early access.',
})

export const Route = createFileRoute('/pricing')({
  head: () => ({ meta: pricingMeta.meta, links: pricingMeta.links }),
  loader: () => getBillingOverview(),
  component: PricingPage,
})


function PricingPage() {
  const billing = Route.useLoaderData()
  const { free, household } = WOLLIE_PLANS
  const earlyAccess = !billing || billing.billingMode === 'early_access'

  const cta = billing
    ? <Link to="/app" className="ds-btn ds-btn--primary">Open Wollie <ArrowRight aria-hidden="true" /></Link>
    : <Link to="/login" search={loginSearch({ signup: true })} className="ds-btn ds-btn--primary">Start free <ArrowRight aria-hidden="true" /></Link>

  return (
    <SitePage>
      <div className="ds-container site-wrap">
        <SiteHead
          eyebrow="Pricing"
          title={<>Start free. <em>Upgrade</em> later.</>}
          lede={earlyAccess ? 'Everything is free during early access. We will tell you before that changes.' : undefined}
        />

        <div className="site-plans">
          <section className="site-plan" aria-labelledby="plan-free">
            <h2 id="plan-free" className="site-plan__name">{free.name}</h2>
            <p className="site-plan__price">€0</p>
            <ul className="site-plan__list">
              <li><Check aria-hidden="true" />{free.limits.bankConnections} bank connections</li>
              <li><Check aria-hidden="true" />{free.limits.budgetEnvelopes} budget categories</li>
              <li><Check aria-hidden="true" />Savings goals</li>
            </ul>
          </section>

          <section className="site-plan" aria-labelledby="plan-household">
            <h2 id="plan-household" className="site-plan__name">{household.name}</h2>
            <p className="site-plan__price">
              €{household.monthlyPrice}<span> / month</span>
            </p>
            <p className="site-plan__sub">or €{household.yearlyPrice} a year</p>
            <ul className="site-plan__list">
              <li><Check aria-hidden="true" />Unlimited bank connections</li>
              <li><Check aria-hidden="true" />Unlimited budget categories</li>
              <li><Check aria-hidden="true" />Backup and restore</li>
            </ul>
          </section>
        </div>

        <div className="site-pricing-cta">{cta}</div>
      </div>
    </SitePage>
  )
}
