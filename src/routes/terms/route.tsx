import { createFileRoute } from '@tanstack/react-router'
import { SitePage } from '#/components/SitePage'

export const Route = createFileRoute('/terms')({
  component: SitePage,
})
