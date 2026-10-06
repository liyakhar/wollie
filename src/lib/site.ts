export const site = {
  name: 'Wollie',
  tagline: 'Know what you can spend',
  description:
    'A personal finance dashboard that connects accounts, organizes spending, tracks bills, and shows what you can safely spend each month.',
  locale: 'en_US',
  twitterHandle: '@wollie',
  email: 'hello@wollie.app',
} as const

export function getSiteUrl(): string {
  const url =
    import.meta.env.SITE_URL ||
    import.meta.env.VITE_SITE_URL ||
    process.env.SITE_URL ||
    process.env.BETTER_AUTH_URL ||
    'http://localhost:3000'
  return url.replace(/\/$/, '')
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl()
  if (path === '/' || path === '') return `${base}/`
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
