import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { SiteHead } from '#/components/SitePage'
import { guides } from '#/content/guides'
import { breadcrumbJsonLd, buildPageMeta, jsonLdScript } from '#/lib/seo'

const meta = buildPageMeta({
  path: '/guides',
  title: 'Money guides for couples',
  description: 'Plain guides on budgeting together, saving for a home and using more than one bank.',
})

export const Route = createFileRoute('/guides/')({
  head: () => ({
    meta: meta.meta,
    links: meta.links,
    scripts: [
      jsonLdScript(
        breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
        ]),
      ),
    ],
  }),
  component: GuidesPage,
})

function GuidesPage() {
  return (
    <div className="ds-container site-wrap">
      <SiteHead eyebrow="Guides" title={<>Money, in <em>plain words.</em></>} lede="Short guides on budgeting together, saving for a home and using more than one bank." />
      <ul className="guide-list">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link to="/guides/$slug" params={{ slug: guide.slug }} className="guide-card">
              <h2>{guide.title}</h2>
              <p>{guide.description}</p>
              <span className="guide-card__more">Read the guide <ArrowRight aria-hidden="true" size={16} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
