import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '#/components/AppShell'
import { requireOnboarded, requireSignedIn } from '#/server/profiles'

export const Route = createFileRoute('/app')({
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow, noarchive' }],
  }),
  loader: async () => {
    await requireSignedIn({ data: { redirect: '/app' } })
    // New accounts see the Start free step once before Home.
    await requireOnboarded()
  },
  component: AppRoute,
})

function AppRoute() {
  return <AppShell />
}
