import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { authClient } from '#/lib/auth-client'
import { useIsNativeApp } from '#/lib/native-app'
import { biometricAvailable, readLockPreference, verifyDevice, writeLockPreference } from '#/lib/app-lock'
import { IconChevronLeft, IconChevronRight } from './icons'

function Row({ to, label, value }: { to: string; label: string; value?: ReactNode }) {
  return (
    <li>
      <Link to={to} className="m-group__row">
        <span className="m-group__label">{label}</span>
        {value !== undefined && <span className="m-group__value">{value}</span>}
        <IconChevronRight className="m-group__chevron" aria-hidden="true" />
      </Link>
    </li>
  )
}

export function ProfileScreen({
  planName,
  paydayLabel,
  paydayAuto,
}: {
  planName: string
  paydayLabel: string
  paydayAuto: boolean
  billCount?: number
}) {
  const router = useRouter()
  const native = useIsNativeApp()
  const [canLock, setCanLock] = useState(false)
  const [lockOn, setLockOn] = useState(false)
  useEffect(() => {
    setLockOn(readLockPreference())
    void biometricAvailable().then(setCanLock)
  }, [])
  async function toggleLock() {
    if (lockOn) {
      writeLockPreference(false)
      setLockOn(false)
      return
    }
    if (await verifyDevice('Turn on the Face ID lock')) {
      writeLockPreference(true)
      setLockOn(true)
    }
  }
  const { data: session } = authClient.useSession()
  const user = session?.user
  const initial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'W'

  return (
    <main id="main" className="m-screen">
      <header className="m-title-row m-title-row--back">
        <Link to="/app" className="m-icon-button m-icon-button--glass" aria-label="Back to Home">
          <IconChevronLeft aria-hidden="true" />
        </Link>
      </header>

      <section className="m-identity">
        <span className="m-identity__avatar" aria-hidden="true">{initial}</span>
        <div>
          <h1>{user?.name || 'Your profile'}</h1>
          {user?.email && <p>{user.email}</p>}
        </div>
      </section>

      <section className="m-group" aria-label="Money">
        <h2>Money</h2>
        <ul>
          <Row to="/app/accounts" label="Bank accounts" />
          <Row to="/app/recurring" label="Bills" />
          <Row to="/app/budgets" label="Payday" value={paydayAuto ? `${paydayLabel} · auto` : paydayLabel} />
        </ul>
      </section>

      <section className="m-group" aria-label="People">
        <h2>People</h2>
        <ul>
          <Row to="/app/household" label="Share with a partner" />
        </ul>
      </section>

      <section className="m-group" aria-label="Plan">
        <h2>Plan</h2>
        <ul>
          {!native && <Row to="/app/billing" label="Your plan" value={planName} />}
        </ul>
      </section>

      {canLock && (
        <section className="m-group" aria-label="Security">
          <h2>Security</h2>
          <ul>
            <li>
              <button type="button" className="m-group__row m-group__row--button" role="switch" aria-checked={lockOn} onClick={() => void toggleLock()}>
                <span className="m-group__label">Face ID lock</span>
                <span className={`m-switch-pill${lockOn ? ' is-on' : ''}`} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>
      )}

      <section className="m-group" aria-label="Data">
        <h2>Data</h2>
        <ul>
          <Row to="/settings/data" label="Export, backup, and account" />
        </ul>
      </section>

      <button
        type="button"
        className="m-button m-button--wide"
        onClick={() => void authClient.signOut().then(() => router.navigate({ to: '/login' }))}
      >
        Sign out
      </button>
    </main>
  )
}
