import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { IntroScreen, introSeenOnDevice } from '#/components/onboarding/IntroScreen'
import { NATIVE_API_ORIGIN } from '#/lib/app-origin'
import { loginSearch } from '#/lib/auth-nav'

export const Route = createFileRoute('/start')({
  head: () => ({
    meta: [
      { title: 'Welcome · Wollie' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' && search.redirect.startsWith('/')
        ? search.redirect
        : '/app',
  }),
  component: StartPage,
})

function StartPage() {
  const { redirect } = Route.useSearch()
  // Inside the iPhone app, skip the intro once this phone has seen it.
  const [seen, setSeen] = useState(false)
  useEffect(() => setSeen(Boolean(NATIVE_API_ORIGIN) && introSeenOnDevice()), [])
  if (seen) return <Navigate to="/login" search={loginSearch({ redirect })} replace />
  return <IntroScreen redirect={redirect} />
}
