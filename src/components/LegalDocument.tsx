import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { SiteHead } from '#/components/SitePage'

export function LegalDocument({
  eyebrow,
  title,
  summary,
  updated,
  children,
}: {
  eyebrow: string
  title: string
  summary: string
  updated: string
  children: ReactNode
}) {
  return (
    <div className="ds-container site-wrap">
      <SiteHead eyebrow={eyebrow} title={title} lede={summary} meta={`Last updated ${updated}`} />
      <article className="site-prose">{children}</article>
      <nav className="site-links" aria-label="Legal pages">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/legal-notice">Legal notice</Link>
        <Link to="/">Back to Wollie</Link>
      </nav>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  )
}
