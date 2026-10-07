import { Outlet, useLocation } from '@tanstack/react-router'
import AppNav from '#/components/AppNav'
import { AppMobileNav } from '#/components/AppMobileNav'
import { OfflineBanner } from '#/components/OfflineBanner'
import { LockScreen } from '#/components/LockScreen'
import { useAppLock } from '#/lib/app-lock'

export function AppShell({
  children,
  locked = false,
  demo = false,
}: {
  children?: React.ReactNode;
  locked?: boolean;
  demo?: boolean;
}) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const lock = useAppLock()

  return (
    <div className="app-shell">
      <OfflineBanner />
      {lock.locked && <LockScreen busy={lock.busy} onUnlock={() => void lock.unlock()} />}
      <AppNav demo={demo} locked={locked} />
      <div className="app-shell__main">
        {/* The key replays the page-enter animation on each tab change. */}
        <div key={pathname} className="app-shell__page">
          {children ?? <Outlet />}
        </div>
      </div>
      <AppMobileNav demo={demo} locked={locked} />
    </div>
  )
}
