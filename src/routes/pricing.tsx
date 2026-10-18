import { createFileRoute } from '@tanstack/react-router'
import { PricingPlans } from '#/components/billing/PricingPlans'
import { SitePage, SiteHead } from '#/components/SitePage'
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

  return (
    <SitePage slim>
      <div className="ds-container site-wrap site-wrap--center">
        <SiteHead title="Start free. Upgrade later." />

        <PricingPlans billing={billing} />
      </div>
    </SitePage>
  )
}
