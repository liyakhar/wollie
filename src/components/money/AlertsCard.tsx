import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { getPushStatus, registerPushDevice } from '#/server/push'

/**
 * Asks to turn on budget alerts, only inside the phone app and only once the
 * person has a budget (a moment when alerts are clearly useful).
 */
export function AlertsCard() {
  const [state, setState] = useState<'hidden' | 'ask' | 'working' | 'denied'>('hidden')

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void getPushStatus().then((status) => setState(status.enabled ? 'hidden' : 'ask')).catch(() => undefined)
  }, [])

  async function turnOn() {
    setState('working')
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      const permission = await PushNotifications.requestPermissions()
      if (permission.receive !== 'granted') {
        setState('denied')
        return
      }
      await PushNotifications.addListener('registration', (token) => {
        void registerPushDevice({ data: { token: token.value } }).then(() => setState('hidden'))
      })
      await PushNotifications.addListener('registrationError', () => setState('denied'))
      await PushNotifications.register()
    } catch {
      setState('denied')
    }
  }

  if (state === 'hidden') return null

  return (
    <section className="m-alertcard" aria-label="Budget alerts">
      <p className="m-alertcard__title">Get budget alerts</p>
      <p className="m-alertcard__body">
        {state === 'denied'
          ? 'Alerts are off. You can turn them on in iPhone Settings, then Wollie, then Notifications.'
          : 'We tell you when a budget is nearly used up or a bill is due. Nothing else.'}
      </p>
      {state !== 'denied' && (
        <button type="button" className="m-button m-button--primary" disabled={state === 'working'} onClick={() => void turnOn()}>
          {state === 'working' ? 'Asking…' : 'Turn on alerts'}
        </button>
      )}
    </section>
  )
}
