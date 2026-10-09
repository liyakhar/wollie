import { absoluteUrl, getSiteUrl, site } from '#/lib/site'

const DEFAULT_OG_IMAGE = '/og/share-v4.png'
const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

export function truncateText(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

export function pageTitle(title?: string): string {
  if (!title) return `${site.name} | ${site.tagline}`
  const full = `${title} · ${site.name}`
  return truncateText(full, 60)
}

export function pageDescription(description?: string): string {
  return truncateText(description ?? site.description, 160)
}

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { charSet: string }
  | { httpEquiv: string; content: string }

type HeadLink = {
  rel: string
  href: string
  type?: string
  sizes?: string
}

type HeadScript = {
  type?: string
  children: string
}

export function buildPageMeta({
  title,
  description,
  path,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
}: {
  title?: string
  description?: string
  path: string
  ogType?: 'website' | 'article' | 'profile'
  ogImage?: string
  noindex?: boolean
}) {
  const resolvedTitle = pageTitle(title)
  const resolvedDescription = pageDescription(description)
  const canonical = absoluteUrl(path)
  const image = ogImage.startsWith('http') ? ogImage : absoluteUrl(ogImage)

  const meta: MetaTag[] = [
    { title: resolvedTitle },
    { name: 'description', content: resolvedDescription },
    { property: 'og:title', content: resolvedTitle },
    { property: 'og:description', content: resolvedDescription },
    { property: 'og:url', content: canonical },
    { property: 'og:type', content: ogType },
    { property: 'og:site_name', content: site.name },
    { property: 'og:locale', content: site.locale },
    { property: 'og:image', content: image },
    { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
    { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
    { property: 'og:image:alt', content: `${site.name} | ${site.tagline}` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: resolvedTitle },
    { name: 'twitter:description', content: resolvedDescription },
    { name: 'twitter:image', content: image },
    { name: 'twitter:image:alt', content: `${site.name} | ${site.tagline}` },
  ]

  if (noindex) {
    meta.push({ name: 'robots', content: 'noindex, nofollow, noarchive' })
  } else {
    meta.push({
      name: 'robots',
      content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    })
  }

  const links: HeadLink[] = [{ rel: 'canonical', href: canonical }]

  return { meta, links }
}

export function jsonLdScript(data: Record<string, unknown> | Array<Record<string, unknown>>): HeadScript {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(data),
  }
}

export function organizationJsonLd() {
  const base = absoluteUrl('/')
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: base,
    logo: absoluteUrl('/logo512.png'),
    description: site.description,
    email: site.email,
  }
}

export function webSiteJsonLd() {
  const base = absoluteUrl('/')
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: base,
    description: site.description,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: base,
    },
  }
}

export function softwareApplicationJsonLd() {
  const base = absoluteUrl('/')
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    url: base,
    description: site.description,
    applicationCategory: 'FinanceApplication',
    applicationSubCategory: 'Personal finance and budgeting',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript and a modern web browser',
    featureList: [
      'Read-only bank account connections',
      'Balance and transaction dashboard',
      'Monthly budget planning',
      'Bill and recurring payment tracking',
    ],
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: base,
    },
  }
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function articleJsonLd({
  title,
  description,
  path,
  publishedAt,
  updatedAt,
  authorName,
  authorUrl,
}: {
  title: string
  description: string
  path: string
  publishedAt: string
  updatedAt: string
  authorName: string
  authorUrl?: string
}) {
  const url = absoluteUrl(path)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Person',
      name: authorName,
      ...(authorUrl ? { url: absoluteUrl(authorUrl) } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: getSiteUrl(),
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/wollie-logo.svg'),
      },
    },
    datePublished: publishedAt,
    dateModified: updatedAt,
    mainEntityOfPage: url,
    url,
  }
}

export function faqPageJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export function personJsonLd({
  name,
  username,
  description,
  image,
}: {
  name: string
  username: string
  description?: string
  image?: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name,
      url: absoluteUrl(`/u/${username}`),
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
    },
  }
}

export function googleSiteVerificationMeta(): MetaTag[] {
  const token = process.env.GOOGLE_SITE_VERIFICATION?.trim()
  if (!token) return []
  return [{ name: 'google-site-verification', content: token }]
}

export const defaultHeadLinks = (): HeadLink[] => [
  { rel: 'icon', href: '/wollie-logo.svg', type: 'image/svg+xml' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
  { rel: 'manifest', href: '/manifest.json' },
]
