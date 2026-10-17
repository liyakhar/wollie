import type { ReactNode } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
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

export function SiteFooter() {
  return (
    <footer className="landing-footer site-footer">
      <div className="ds-container">
        <div className="landing-footer__top">
          <Link to="/" className="ds-wordmark landing-footer__mark">Wollie</Link>
        </div>
        <div className="landing-footer__row">
          <nav aria-label="Footer navigation" className="landing-footer__nav">
            <Link to="/about">About</Link>
            <Link to="/pricing" search={{ checkout: undefined }}>Pricing</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/legal-notice">Legal notice</Link>
          </nav>
          <span className="ds-muted">© 2026 Wollie</span>
        </div>
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
