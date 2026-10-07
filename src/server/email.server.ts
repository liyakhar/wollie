type AccountEmail = {
  to: string
  subject: string
  text: string
  html: string
}

export function isTransactionalEmailConfigured(
  env: { BREVO_API_KEY?: string; RESEND_API_KEY?: string; CLOUDFLARE_EMAIL_TOKEN?: string; CLOUDFLARE_ACCOUNT_ID?: string; EMAIL_FROM?: string } = process.env,
) {
  return Boolean(getTransactionalEmailProvider(env) && env.EMAIL_FROM?.trim())
}

export function getTransactionalEmailProvider(
  env: { BREVO_API_KEY?: string; RESEND_API_KEY?: string; CLOUDFLARE_EMAIL_TOKEN?: string; CLOUDFLARE_ACCOUNT_ID?: string } = process.env,
) {
  if (env.CLOUDFLARE_EMAIL_TOKEN?.trim() && env.CLOUDFLARE_ACCOUNT_ID?.trim()) return 'cloudflare'
  if (env.BREVO_API_KEY?.trim()) return 'brevo'
  if (env.RESEND_API_KEY?.trim()) return 'resend'
  return null
}

export async function sendAccountEmail(message: AccountEmail) {
  const from = process.env.EMAIL_FROM?.trim()
  const provider = getTransactionalEmailProvider()

  if (!isTransactionalEmailConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[wollie] Email not delivered in development: ${message.subject} -> ${message.to}`)
      return
    }
    throw new Error('Transactional email is not configured.')
  }

  const response = provider === 'cloudflare'
    ? await sendViaCloudflare({ ...message, from: from! })
    : provider === 'brevo'
      ? await sendViaBrevo({ ...message, from: from! })
      : await sendViaResend({ ...message, from: from! })

  if (!response.ok) {
    throw new Error(`Transactional email provider rejected the request (${response.status}).`)
  }
}

async function sendViaCloudflare(message: AccountEmail & { from: string }) {
  const token = process.env.CLOUDFLARE_EMAIL_TOKEN?.trim()
  const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()

  return fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/email/sending/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(15_000),
  })
}

async function sendViaBrevo(message: AccountEmail & { from: string }) {
  const apiKey = process.env.BREVO_API_KEY?.trim()
  const sender = parseSender(message.from)

  return fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey!,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: message.to }],
      subject: message.subject,
      textContent: message.text,
      htmlContent: message.html,
    }),
    signal: AbortSignal.timeout(15_000),
  })
}

async function sendViaResend(message: AccountEmail & { from: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(15_000),
  })
}

export function accountActionEmail(title: string, introduction: string, url: string) {
  const safeTitle = escapeHtml(title)
  const safeIntroduction = escapeHtml(introduction)
  const safeUrl = escapeHtml(url)
  return {
    text: `${introduction}\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<h1>${safeTitle}</h1><p>${safeIntroduction}</p><p><a href="${safeUrl}">Continue securely</a></p><p>If you did not request this, you can ignore this email.</p>`,
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}

function parseSender(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^<>@\s]+@[^<>@\s]+)>\s*$/)
  if (!match) return { email: value.trim() }

  const [, name, email] = match
  return {
    name: name.trim() || undefined,
    email,
  }
}
