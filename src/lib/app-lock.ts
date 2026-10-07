import { useCallback, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

const KEY = 'wollie_face_lock'

export function readLockPreference() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function writeLockPreference(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* private mode: the lock simply stays off */
  }
}

/** Asks iOS for Face ID or the passcode. Resolves true when the person passes. */
export async function verifyDevice(reason: string) {
  const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
  try {
    await NativeBiometric.verifyIdentity({ reason, title: 'Unlock Wollie', useFallback: true })
    return true
  } catch {
    return false
  }
}

export async function biometricAvailable() {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
    const result = await NativeBiometric.isAvailable({ useFallback: true })
    return Boolean(result.isAvailable)
  } catch {
    return false
  }
}

/** Light tap feedback on iPhone. Does nothing on the web. */
export async function tapHaptic() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    /* haptics are a nice extra, never required */
  }
}

/** True while the app is covered by the lock screen. */
export function useAppLock() {
  const [locked, setLocked] = useState(false)
  const [busy, setBusy] = useState(false)

  const unlock = useCallback(async () => {
    setBusy(true)
    const ok = await verifyDevice('Open your money in Wollie')
    setBusy(false)
    if (ok) setLocked(false)
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !readLockPreference()) return
    setLocked(true)
    void unlock()
    let remove: (() => void) | undefined
    void import('@capacitor/app').then(async ({ App }) => {
      const handle = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive && readLockPreference()) setLocked(true)
        if (isActive && readLockPreference()) void unlock()
      })
      remove = () => void handle.remove()
    })
    return () => remove?.()
  }, [unlock])

  return { locked, busy, unlock }
}
