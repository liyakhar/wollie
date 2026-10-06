import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * True inside the iPhone app. Apple only allows paid subscriptions inside an
 * iOS app through In-App Purchase, so the app never shows paid plans or links
 * to web checkout. The website still does.
 */
export function useIsNativeApp() {
  const [native, setNative] = useState(false)
  useEffect(() => setNative(Capacitor.isNativePlatform()), [])
  return native
}
