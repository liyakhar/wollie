import {
  createFileRoute,
  Link,
  useRouter,
  useSearch,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { authClient } from '#/lib/auth-client'
import type { LoginSearch } from '#/lib/auth-nav'
import { buildPageMeta } from '#/lib/seo'
import { PRIVACY_VERSION, TERMS_VERSION } from '#/lib/legal-versions'
import { site } from '#/lib/site'
import { getTransactionalEmailReadiness } from '#/server/email-readiness'

const loginMeta = buildPageMeta({
  path: '/login',
  title: 'Sign in',
  description: 'Sign in to Wollie.',
  noindex: true,
})

export type { LoginSearch }

function safeAppRedirect(value: unknown) {
  if (typeof value !== 'string') return '/app'
  return value === '/app' ||
    value.startsWith('/app/') ||
    value.startsWith('/invite/')
    ? value
    : '/app'
}

const DEV_LOGIN = {
  email: 'dev@wollie.local',
  password: 'wollie-dev-password',
  name: 'Wollie Dev',
  termsAcceptedAt: new Date(),
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
} as const

async function goAfterAuth(
  router: ReturnType<typeof useRouter>,
  redirectTo: string,
) {
  void router.navigate({ href: redirectTo })
}

export const Route = createFileRoute('/login/')({
  head: () => ({
    meta: loginMeta.meta,
    links: loginMeta.links,
  }),
  loader: async () => ({
    isDev: process.env.NODE_ENV === 'development',
    emailReadiness: await getTransactionalEmailReadiness(),
  }),
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: safeAppRedirect(search.redirect),
    signup: search.signup === '1' || search.signup === true ? '1' : undefined,
  }),
  component: LoginPage,
})

type AuthMode = 'signin' | 'signup' | 'forgot' | 'forgot-sent'

function AuthVisual() {
  return (
    <aside className="auth-visual" aria-label="A shared money plan for couples">
      <div className="auth-visual__inner">
        <p className="auth-visual__kicker">Wollie</p>
        <p className="auth-visual__statement">
          Know what you can <em>spend.</em>
        </p>
        <img
          className="auth-visual__art"
          src="/onboarding/intro-1-clear.webp"
          alt=""
          width="900"
          height="900"
        />
      </div>
    </aside>
  )
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="auth-page auth-page--split">
      <section className="auth-page__panel">
        <Link to="/" className="auth-page__brand" aria-label="Wollie home">
          Wollie
        </Link>
        <div className="auth-page__content">{children}</div>
      </section>
      <AuthVisual />
    </main>
  )
}

function LoginPage() {
  const router = useRouter()
  const { redirect, signup } = useSearch({ from: '/login/' })
  const redirectTo = redirect ?? '/app'
  const { isDev, emailReadiness } = Route.useLoaderData()
  const { data: session, isPending } = authClient.useSession()
  const [mode, setMode] = useState<AuthMode>(
    signup === '1' ? 'signup' : 'signin',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [devLoading, setDevLoading] = useState(false)
  const [acceptedLegal, setAcceptedLegal] = useState(false)

  useEffect(() => {
    if (!isPending && session?.user) {
      void goAfterAuth(router, redirectTo)
    }
  }, [isPending, session?.user, router, redirectTo])

  if (isPending) {
    return <main className="app-loading">Loading…</main>
  }

  if (session?.user) {
    return null
  }

  const isSignUp = mode === 'signup'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        const trimmedFirstName = firstName.trim()
        const trimmedLastName = lastName.trim()
        const fullName = [trimmedFirstName, trimmedLastName]
          .filter(Boolean)
          .join(' ')

        if (!trimmedFirstName || !trimmedLastName) {
          setError('Enter your first and last name to create an account.')
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }
        if (!acceptedLegal) {
          setError(
            'Accept the Terms and acknowledge the Privacy Policy to create an account.',
          )
          return
        }
        const result = await authClient.signUp.email({
          email: email.trim().toLowerCase(),
          password,
          name: fullName,
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
        })
        if (result.error) {
          setError(result.error.message || 'Sign up failed')
        } else {
          await goAfterAuth(router, redirectTo)
        }
      } else {
        const result = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        })
        if (result.error) {
          setError(result.error.message || 'Sign in failed')
        } else {
          await goAfterAuth(router, redirectTo)
        }
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!emailReadiness.configured) {
      setError(
        'Password reset is temporarily unavailable. Please try again later.',
      )
      return
    }

    setLoading(true)

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (result.error) {
        setError(result.error.message || 'Could not send reset email')
      } else {
        setMode('forgot-sent')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const backToSignIn = () => {
    setMode('signin')
    setError('')
  }

  const handleDevSignIn = async () => {
    if (!isDev) return

    setError('')
    setDevLoading(true)

    try {
      let result = await authClient.signIn.email({
        email: DEV_LOGIN.email,
        password: DEV_LOGIN.password,
      })

      if (result.error) {
        const signup = await authClient.signUp.email(DEV_LOGIN)
        if (signup.error) {
          setError(signup.error.message || 'Dev sign in failed')
          return
        }

        result = await authClient.signIn.email({
          email: DEV_LOGIN.email,
          password: DEV_LOGIN.password,
        })
      }

      if (result.error) {
        setError(result.error.message || 'Dev sign in failed')
        return
      }

      void router.navigate({ to: '/app' })
    } catch {
      setError('Dev sign in failed. Try again.')
    } finally {
      setDevLoading(false)
    }
  }

  if (mode === 'forgot' || mode === 'forgot-sent') {
    return (
      <AuthFrame>
        <header className="app-page__head auth-page__head">
          <p className="app-page__eyebrow">Account</p>
          <h1 className="app-page__title">
            {mode === 'forgot-sent' ? 'Check your email' : 'Reset password'}
          </h1>
          <p className="app-page__lede">
            {mode === 'forgot-sent'
              ? 'If an account exists for that address, we sent a reset link.'
              : emailReadiness.configured
                ? 'Enter your email and we will send a reset link.'
                : 'Password reset is temporarily unavailable.'}
          </p>
        </header>

        <div className="auth-stack">
          {mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="auth-form">
              <div className="app-form__field">
                <label className="app-form__label" htmlFor="forgot-email">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="app-form__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error && <p className="post-detail__error">{error}</p>}
              {!emailReadiness.configured && (
                <p className="app-form__hint">
                  Email delivery is not set up yet, so a reset link cannot be
                  sent. Need help?{' '}
                  <a
                    className="underline underline-offset-4"
                    href={`mailto:${site.email}`}
                  >
                    Email Wollie support
                  </a>
                  .
                </p>
              )}
              <div className="app-form__actions">
                <button
                  type="submit"
                  className="btn"
                  disabled={loading || !emailReadiness.configured}
                >
                  <span className="btn__label">
                    {loading ? 'Sending…' : 'Send reset link'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            isDev && (
              <p className="app-form__hint">
                Local dev: the reset URL is printed in the server console.
              </p>
            )
          )}

          <footer className="auth-footer">
            <button
              type="button"
              className="login-switch"
              onClick={backToSignIn}
            >
              Back to sign in
            </button>
          </footer>
        </div>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame>
      <header className="app-page__head auth-page__head">
        <h1 className="app-page__title">
          {isSignUp ? 'Create account' : 'Sign in'}
        </h1>
        <p className="auth-page__intro">
          {isSignUp
            ? 'Start with one clear view of your money.'
            : 'Your money in one place.'}
        </p>
      </header>

      <div className="auth-stack">
        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="app-form__field">
                <label className="app-form__label" htmlFor="first-name">
                  First name
                </label>
                <input
                  id="first-name"
                  className="app-form__input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="app-form__field">
                <label className="app-form__label" htmlFor="last-name">
                  Last name
                </label>
                <input
                  id="last-name"
                  className="app-form__input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>
          )}
          <div className="app-form__field">
            <label className="app-form__label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="app-form__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          {isSignUp && (
            <label className="flex items-start gap-3 text-sm leading-6 text-black/65">
              <input
                type="checkbox"
                checked={acceptedLegal}
                onChange={(event) =>
                  setAcceptedLegal(event.currentTarget.checked)
                }
                required
                className="mt-1 size-4"
              />
              <span>
                I accept the{' '}
                <Link to="/terms" className="underline underline-offset-4">
                  Terms
                </Link>{' '}
                and acknowledge the{' '}
                <Link to="/privacy" className="underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          )}
          <div className="app-form__field">
            <div className="app-form__label-row">
              <label className="app-form__label" htmlFor="password">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setMode('forgot')
                    setError('')
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="password"
              type="password"
              className="app-form__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>
          {isSignUp && (
            <div className="app-form__field">
              <label className="app-form__label" htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                className="app-form__input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          )}
          {error && <p className="post-detail__error">{error}</p>}
          <div className="app-form__actions">
            <button type="submit" className="btn" disabled={loading}>
              <span className="btn__label">
                {loading
                  ? 'Please wait…'
                  : isSignUp
                    ? 'Create account'
                    : 'Sign in'}
              </span>
            </button>
          </div>
        </form>

        <footer className="auth-footer">
          <Link
            to="/pricing"
            search={{ checkout: undefined }}
            className="login-switch"
          >
            Pricing
          </Link>
          <button
            type="button"
            onClick={() => {
              setMode(isSignUp ? 'signin' : 'signup')
              setError('')
            }}
            className="login-switch"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Create account'}
          </button>
          {isDev && !isSignUp && (
            <button
              type="button"
              className="login-switch"
              disabled={devLoading || loading}
              onClick={() => void handleDevSignIn()}
            >
              {devLoading ? 'Opening dev account...' : 'Dev sign in'}
            </button>
          )}
        </footer>
      </div>
    </AuthFrame>
  )
}
