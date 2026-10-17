import { createFileRoute, Link } from '@tanstack/react-router'
import { buildPageMeta, breadcrumbJsonLd, jsonLdScript } from '#/lib/seo'
import { SiteHead } from '#/components/SitePage'

const aboutMeta = buildPageMeta({
  path: '/about',
  title: 'About Wollie',
  description: 'Wollie helps you see where your money goes, stay within a budget and save for what matters, alone or together.',
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
        <p>Wollie sorts every payment by category, so you can see where your money goes. You set a monthly budget for each category and a fixed amount for each savings goal.</p>
        <p>Couples can plan together while each person keeps their own banks and logins. The bank link is read-only, so Wollie can look at your payments but never move your money.</p>
        <p><Link to="/app">Open the demo</Link> or read our <Link to="/guides">money guides</Link>.</p>
      </article>
    </div>
  )
}
