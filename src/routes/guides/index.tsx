import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { SiteHead } from '#/components/SitePage'
import { guides, guideTopics } from '#/content/guides'
import { breadcrumbJsonLd, buildPageMeta, jsonLdScript } from '#/lib/seo'

const meta = buildPageMeta({
  path: '/guides',
  title: 'Money guides for couples',
  description: 'Plain guides on budgeting as a couple, saving for a home, a wedding or a baby, and connecting your bank safely.',
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
      <SiteHead eyebrow="Guides" title={<>Money, in <em>plain words.</em></>} lede="Short guides on budgeting together, saving for what matters and using your bank safely." />
      {guideTopics.map((topic) => (
        <section key={topic} className="guide-topic" aria-labelledby={`topic-${topic.replace(/\s+/g, '-')}`}>
          <h2 id={`topic-${topic.replace(/\s+/g, '-')}`} className="guide-topic__name">{topic}</h2>
          <ul className="guide-topic__list">
            {guides.filter((guide) => guide.topic === topic).map((guide) => (
              <li key={guide.slug}>
                <Link to="/guides/$slug" params={{ slug: guide.slug }} className="guide-row">
                  <span className="guide-row__title">{guide.title}</span>
                  <span className="guide-row__text">{guide.description}</span>
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
