import { useEffect, useState } from 'react'

/** A thin banner that appears when the phone loses its connection. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null
  return (
    <div className="offline-banner" role="status">
      You are offline. Changes will not save until you reconnect.
    </div>
  )
}
