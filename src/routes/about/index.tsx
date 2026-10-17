import { createFileRoute, Link } from '@tanstack/react-router'
import { buildPageMeta, breadcrumbJsonLd, jsonLdScript } from '#/lib/seo'
import { site } from '#/lib/site'
import { SiteHead } from '#/components/SitePage'

const aboutMeta = buildPageMeta({
  path: '/about',
  title: 'About Wollie',
  description: 'Wollie is a calm budget that shows what you can spend.',
})

export const Route = createFileRoute('/about/')({
  head: () => ({
    meta: aboutMeta.meta,
    links: aboutMeta.links,
    scripts: [
      jsonLdScript(
        breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]),
      ),
    ],
  }),
  component: AboutPage,
})

function AboutPage() {
  return (
    <div className="ds-container site-wrap">
      <SiteHead eyebrow="About" title={<>Budgeting without the <em>chore.</em></>} />
      <article className="site-prose">
        <p>Connect accounts. Review less. Spend with a number.</p>
        <p><Link to="/app">Open the demo</Link>.</p>
      </article>
    </div>
  )
}
