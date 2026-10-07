const callbackHosts = new Set([
  'wollie.pages.dev',
  'getwollie.com',
  'www.getwollie.com',
  'onie-web-production.up.railway.app',
])

const callbackFields = ['code', 'state', 'error', 'error_description', 'bank'] as const

export function nativeBankReturnPath(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const customScheme =
    url.protocol === 'wollie:' &&
    url.hostname === 'bank-return' &&
    (url.pathname === '' || url.pathname === '/')
  const universalLink =
    url.protocol === 'https:' &&
    callbackHosts.has(url.hostname) &&
    url.pathname === '/app/accounts'

  if ((!customScheme && !universalLink) || url.username || url.password || url.port) {
    return null
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const bank = url.searchParams.get('bank')
  const error = url.searchParams.get('error')
  if (!(code && state) && bank !== 'connected' && !error) return null

  const params = new URLSearchParams()
  for (const field of callbackFields) {
    const entry = url.searchParams.get(field)
    if (entry && entry.length <= 4096) params.set(field, entry)
  }
  if (!params.has('bank') && !(params.has('code') && params.has('state')) && !params.has('error')) {
    return null
  }
  params.set('return', 'app')
  return `/app/accounts?${params.toString()}`
}

export function bankReturnHandoffResponse(request: Request): Response | null {
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.searchParams.has('return')) return null

  const appPath = nativeBankReturnPath(url.toString())
  if (!appPath) return null

  const publicOrigin = request.headers.get('x-wollie-source-host') === 'wollie.pages.dev'
    ? 'https://wollie.pages.dev'
    : url.origin
  const webPath = new URL(appPath, publicOrigin)
  webPath.searchParams.set('return', 'web')

  if (!/iPhone|iPad|iPod/i.test(request.headers.get('user-agent') || '')) {
    return Response.redirect(webPath, 302)
  }

  const appLink = new URL('wollie://bank-return')
  for (const field of callbackFields) {
    const entry = url.searchParams.get(field)
    if (entry && entry.length <= 4096) appLink.searchParams.set(field, entry)
  }

  const nonce = crypto.randomUUID().replaceAll('-', '')
  const link = escapeHtml(appLink.toString())
  const fallback = escapeHtml(webPath.toString())
  const scriptUrl = JSON.stringify(appLink.toString()).replaceAll('<', '\\u003c')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Return to Wollie</title>
<style nonce="${nonce}">body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#fbf3e6;color:#10273a;font:16px system-ui,sans-serif}main{width:min(100% - 40px,360px)}h1{font-size:28px;line-height:1.15}p{line-height:1.5;color:#465664}a{display:block;padding:14px 18px;margin-top:16px;text-align:center;text-decoration:none;border-radius:8px;background:#10273a;color:white;font-weight:600}a.secondary{background:transparent;color:#10273a;border:1px solid #b9c3c5}</style></head>
<body><main><h1>Return to Wollie</h1><p>Open the app to finish connecting your bank.</p><a href="${link}">Open Wollie</a><a class="secondary" href="${fallback}">Continue on the web</a></main>
<script nonce="${nonce}">window.location.href=${scriptUrl}</script></body></html>`

  return new Response(html, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'`,
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex',
    },
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&"<>]/g, (character) => ({
    '&': '&amp;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;',
  })[character] || character)
}
