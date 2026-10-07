import { describe, expect, it } from 'vitest'
import { getTransactionalEmailProvider, isTransactionalEmailConfigured } from './email.server'

describe('transactional email readiness', () => {
  it('accepts Cloudflare Email Service', () => {
    expect(isTransactionalEmailConfigured({ CLOUDFLARE_EMAIL_TOKEN: 'tok', CLOUDFLARE_ACCOUNT_ID: 'acc', EMAIL_FROM: 'Wollie <account@getwollie.com>' })).toBe(true)
    expect(getTransactionalEmailProvider({ CLOUDFLARE_EMAIL_TOKEN: 'tok', CLOUDFLARE_ACCOUNT_ID: 'acc', RESEND_API_KEY: 're' })).toBe('cloudflare')
  })

  it('accepts either a Brevo or Resend key with a sender address', () => {
    expect(isTransactionalEmailConfigured({ BREVO_API_KEY: 'xkeysib-test', EMAIL_FROM: 'Wollie <test@example.com>' })).toBe(true)
    expect(isTransactionalEmailConfigured({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'Wollie <test@example.com>' })).toBe(true)
    expect(isTransactionalEmailConfigured({ RESEND_API_KEY: 're_test', EMAIL_FROM: '' })).toBe(false)
    expect(isTransactionalEmailConfigured({ RESEND_API_KEY: '', EMAIL_FROM: 'test@example.com' })).toBe(false)
  })

  it('prefers Brevo when both providers are present', () => {
    expect(getTransactionalEmailProvider({ BREVO_API_KEY: 'xkeysib-test', RESEND_API_KEY: 're_test' })).toBe('brevo')
    expect(getTransactionalEmailProvider({ RESEND_API_KEY: 're_test' })).toBe('resend')
    expect(getTransactionalEmailProvider({})).toBe(null)
  })

  it('treats whitespace-only values as missing', () => {
    expect(isTransactionalEmailConfigured({ BREVO_API_KEY: '  ', RESEND_API_KEY: '  ', EMAIL_FROM: '\n' })).toBe(false)
  })
})
