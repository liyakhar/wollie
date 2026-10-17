export const site = {
  name: 'Wollie',
  tagline: 'A plan for your money',
  description:
    'Wollie sorts your spending by category, keeps your monthly budgets and savings goals on track, and lets couples plan together, even with different banks.',
  locale: 'en_US',
  twitterHandle: '@wollie',
  email: 'hello@getwollie.com',
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
