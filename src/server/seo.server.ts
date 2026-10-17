import { guides } from '#/content/guides'
import { absoluteUrl } from '#/lib/site'

export type SitemapEntry = {
  path: string
  lastModified: string
  changeFrequency: 'weekly' | 'monthly' | 'yearly'
  priority: number
}

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const staticRoutes: SitemapEntry[] = [
    { path: '/', lastModified: '2026-07-15', changeFrequency: 'weekly', priority: 1 },
    { path: '/pricing', lastModified: '2026-07-15', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/about', lastModified: '2026-07-15', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/guides', lastModified: '2026-10-18', changeFrequency: 'weekly', priority: 0.8 },
    ...guides.map((guide) => ({ path: `/guides/${guide.slug}`, lastModified: guide.updated, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { path: '/privacy', lastModified: '2026-07-14', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/terms', lastModified: '2026-07-14', changeFrequency: 'yearly', priority: 0.2 },
  ]

  return staticRoutes
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${absoluteUrl(entry.path)}</loc>
    <lastmod>${entry.lastModified}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

export function buildRobotsTxt(): string {
  const sitemap = absoluteUrl('/sitemap.xml')
  return `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Disallow: /app
Disallow: /blog
Disallow: /p/
Disallow: /u/
Disallow: /login
Disallow: /reset-password
Disallow: /welcome
Disallow: /settings
Disallow: /new
Disallow: /demo/
Disallow: /api/

Sitemap: ${sitemap}
`
}
