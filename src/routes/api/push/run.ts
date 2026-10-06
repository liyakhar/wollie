import { createFileRoute } from '@tanstack/react-router'
import { runAlertsForEveryone } from '#/server/push.server'

// Called by a scheduler. Needs the PUSH_CRON_SECRET header.
async function handle(request: Request) {
  const secret = process.env.PUSH_CRON_SECRET
  if (!secret || request.headers.get('x-cron-secret') !== secret) {
    return new Response('Not found', { status: 404 })
  }
  return Response.json(await runAlertsForEveryone())
}

export const Route = createFileRoute('/api/push/run')({
  server: { handlers: { GET: ({ request }) => handle(request), POST: ({ request }) => handle(request) } },
})
