import { createServerFn } from '@tanstack/react-start'

/**
 * Dev sign in. In development it is always on. In production it is off unless
 * DEV_LOGIN_ENABLED=true and DEV_LOGIN_CODE is set, and then it needs the code.
 * The dev account (dev@wollie.local) only ever shows sample data, never real banks.
 */
export function devLoginEnabled() {
  if (process.env.NODE_ENV === 'development') return true
  return process.env.DEV_LOGIN_ENABLED === 'true' && Boolean(process.env.DEV_LOGIN_CODE)
}

export function devLoginNeedsCode() {
  return process.env.NODE_ENV !== 'development'
}

// Global lockout: 8 wrong codes in 10 minutes pauses dev sign in for 10 minutes.
const failures: number[] = []
const WINDOW_MS = 10 * 60 * 1000

export const getDevLoginPassword = createServerFn({ method: 'POST' })
  .inputValidator((data: { code?: string }) => data)
  .handler(async ({ data }) => {
    if (!devLoginEnabled()) throw new Error('Dev sign in is off')
    const { createHmac, timingSafeEqual } = await import('node:crypto')

    if (devLoginNeedsCode()) {
      const now = Date.now()
      while (failures.length && now - failures[0] > WINDOW_MS) failures.shift()
      if (failures.length >= 8) throw new Error('Too many tries. Wait a few minutes.')

      const expected = Buffer.from(process.env.DEV_LOGIN_CODE ?? '')
      const given = Buffer.from(data.code ?? '')
      const ok = expected.length === given.length && timingSafeEqual(expected, given)
      if (!ok) {
        failures.push(now)
        throw new Error('That code is not right.')
      }
    }

    const secret = process.env.BETTER_AUTH_SECRET ?? 'wollie-dev'
    const password = `${createHmac('sha256', secret).update('wollie-dev-login').digest('hex').slice(0, 32)}Aa1!`
    return { password: devLoginNeedsCode() ? password : 'wollie-dev-password' }
  })
