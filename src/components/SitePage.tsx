import type { ReactNode } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { guides } from '#/content/guides'
import { loginSearch } from '#/lib/auth-nav'

/** Header, footer and page frame shared by every public page. Same look as the landing page. */
export function SiteHeader() {
  const { data: session } = authClient.useSession()
  return (
    <header className="landing-header is-stuck">
      <div className="ds-container landing-header__row">
        <Link to="/" aria-label="Wollie home" className="ds-wordmark">Wollie</Link>
        <nav className="landing-header__nav" aria-label="Main navigation">
          <Link to="/" hash="banks" className="ds-btn ds-btn--ghost landing-header__link">Banks</Link>
          <Link to="/pricing" search={{ checkout: undefined }} className="ds-btn ds-btn--ghost landing-header__link">Pricing</Link>
          {session?.user ? (
            <Link to="/app" className="ds-btn ds-btn--primary">Open app</Link>
          ) : (
            <>
              <Link to="/login" search={loginSearch({ signup: false })} className="ds-btn">Sign in</Link>
              <Link to="/login" search={loginSearch({ signup: true })} className="ds-btn ds-btn--primary landing-header__start">Start free</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

/** Brand, link columns and legal line. Used by every public page, the landing page adds its closing call above it. */
export function FooterLinks() {
  return (
    <div className="site-foot">
      <div className="site-foot__brand">
        <Link to="/" className="ds-wordmark site-foot__mark">Wollie</Link>
      </div>
      <nav className="site-foot__col" aria-label="Product">
        <h2>Product</h2>
        <Link to="/" hash="banks">Banks</Link>
        <Link to="/pricing" search={{ checkout: undefined }}>Pricing</Link>
        <Link to="/login" search={loginSearch({ signup: true })}>Start free</Link>
      </nav>
      <nav className="site-foot__col" aria-label="Guides">
        <h2>Guides</h2>
        {guides.map((guide) => (
          <Link key={guide.slug} to="/guides/$slug" params={{ slug: guide.slug }}>{guide.label}</Link>
        ))}
      </nav>
      <nav className="site-foot__col" aria-label="Company">
        <h2>Company</h2>
        <Link to="/about">About</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/legal-notice">Legal notice</Link>
      </nav>
      <p className="site-foot__legal ds-muted">© 2026 Wollie</p>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="landing-footer site-footer">
      <div className="ds-container">
        <FooterLinks />
      </div>
    </footer>
  )
}

export function SitePage({ children }: { children?: ReactNode }) {
  return (
    <div className="ds-page landing site">
      <SiteHeader />
      <main id="main" className="site-main">{children ?? <Outlet />}</main>
      <SiteFooter />
    </div>
  )
}

/** Title block used at the top of every inner page. */
export function SiteHead({ eyebrow, title, lede, meta }: { eyebrow: string; title: ReactNode; lede?: string; meta?: string }) {
  return (
    <header className="site-head">
      <p className="landing-kicker">{eyebrow}</p>
      <h1 className="site-title">{title}</h1>
      {lede ? <p className="site-lede">{lede}</p> : null}
      {meta ? <p className="site-meta">{meta}</p> : null}
    </header>
  )
}

export function SiteCta({ to = '/login' as const, children }: { to?: '/login'; children: ReactNode }) {
  return (
    <Link to={to} search={loginSearch({ signup: true })} className="ds-btn ds-btn--primary ds-btn--lg">
      {children} <ArrowRight aria-hidden="true" />
    </Link>
  )
}
