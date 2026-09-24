import { createFileRoute } from '@tanstack/react-router'
import { IntroScreen } from '#/components/onboarding/IntroScreen'

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
  return <IntroScreen redirect={redirect} />
}
