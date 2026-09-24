import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { Category } from '#/generated/prisma/client'
import { completeOnboarding, getMyProfile } from '#/server/profiles'
import { buildPageMeta } from '#/lib/seo'

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
  const { redirect: redirectTo } = Route.useSearch()
  const { profile } = Route.useLoaderData()
  const [field] = useState<Category>(profile?.field ?? 'FINANCE')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<'bank' | 'later' | null>(null)

  if (!profile) {
    return <main className="app-loading">Loading…</main>
  }

  // The money app needs no public username; keep a stable internal one.
  const username = profile.username || `u-${Math.random().toString(36).slice(2, 10)}`

  const finish = async (next: 'bank' | 'later') => {
    setError('')
    setLoading(next)
    try {
      await completeOnboarding({ data: { username, field, headline: profile.headline ?? '' } })
      void router.navigate({ href: next === 'bank' ? '/app/accounts' : redirectTo })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setLoading(null)
    }
  }

  return (
    <main id="main" className="m-intro m-intro--single">
      <div className="m-intro__top" />
      <section className="m-intro__slide">
        <div className="m-intro__art">
          <img src="/onboarding/intro-2.webp" alt="" width={900} height={1350} decoding="async" />
        </div>
        <div className="m-intro__copy">
          <h1>You’re in.</h1>
          <p>One step left: connect your bank, and Wollie shows what you can safely spend.</p>
        </div>
      </section>
      <div className="m-intro__bottom">
        {error && <p className="m-error" role="alert">{error}</p>}
        <button type="button" className="m-button" disabled={loading !== null} onClick={() => void finish('bank')}>
          {loading === 'bank' ? 'Opening…' : 'Connect bank'}
        </button>
        <button type="button" className="m-link" disabled={loading !== null} onClick={() => void finish('later')}>
          {loading === 'later' ? 'Opening…' : 'Later'}
        </button>
      </div>
    </main>
  )
}
