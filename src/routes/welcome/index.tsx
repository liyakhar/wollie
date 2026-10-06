import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { Category } from '#/generated/prisma/client'
import { completeOnboarding, getMyProfile } from '#/server/profiles'
import { buildPageMeta } from '#/lib/seo'
import { WOLLIE_PLANS } from '#/lib/billing-plans'
import { useIsNativeApp } from '#/lib/native-app'

const welcomeMeta = buildPageMeta({
  path: '/welcome',
  title: 'Welcome',
  description: 'Start with Wollie.',
  noindex: true,
})

export const Route = createFileRoute('/welcome/')({
  head: () => ({
    meta: welcomeMeta.meta,
    links: welcomeMeta.links,
  }),
  loader: async () => {
    const profile = await getMyProfile()
    return { profile }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.startsWith('/')
        ? search.redirect
        : '/app',
  }),
  component: WelcomePage,
})

function WelcomePage() {
  const router = useRouter()
  const native = useIsNativeApp()
  const { redirect: redirectTo } = Route.useSearch()
  const { profile } = Route.useLoaderData()
  const [field] = useState<Category>(profile?.field ?? 'FINANCE')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<'later' | null>(null)

  if (!profile) {
    return <main className="app-loading">Loading…</main>
  }

  // The money app needs no public username; keep a stable internal one.
  const username = profile.username || `u-${Math.random().toString(36).slice(2, 10)}`

  const finish = async (next: 'later') => {
    setError('')
    setLoading(next)
    try {
      await completeOnboarding({ data: { username, field, headline: profile.headline ?? '' } })
      void router.navigate({ href: redirectTo })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setLoading(null)
    }
  }

  {
    return (
      <main id="main" className="m-intro m-intro--single m-plan">
        <div className="m-intro__top" />
        <section className="m-plan__body">
          <h1>Start free.</h1>
          <p className="m-plan__lede">Everything you need to get going. No card needed.</p>

          <div className="m-plan__card m-plan__card--free">
            <div className="m-plan__head">
              <strong>Free</strong>
              <span>€0</span>
            </div>
            <ul>
              <li>Up to {WOLLIE_PLANS.free.limits.bankConnections} bank connections</li>
              <li>Budgets that reset on payday</li>
              <li>Savings goals</li>
              <li>Share with a partner</li>
            </ul>
          </div>

          {!native && (
          <div className="m-plan__card">
            <div className="m-plan__head">
              <strong>Household</strong>
              <span>€{WOLLIE_PLANS.household.monthlyPrice}/month</span>
            </div>
            <ul>
              <li>Unlimited bank connections</li>
              <li>Unlimited budgets</li>
              <li>Backup and restore</li>
            </ul>
            <p className="m-plan__note">Upgrade any time from your profile.</p>
          </div>
          )}
        </section>
        <div className="m-intro__bottom">
          {error && <p className="m-error" role="alert">{error}</p>}
          <button type="button" className="m-button m-button--primary" disabled={loading !== null} onClick={() => void finish('later')}>
            {loading ? 'Opening…' : 'Start free'}
          </button>
        </div>
      </main>
    )
  }

}
