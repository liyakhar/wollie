import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { SiteCta, SiteHead } from '#/components/SitePage'
import { getGuide, guides } from '#/content/guides'
import { articleJsonLd, breadcrumbJsonLd, buildPageMeta, faqPageJsonLd, jsonLdScript } from '#/lib/seo'
import { site } from '#/lib/site'

export const Route = createFileRoute('/guides/$slug')({
  loader: ({ params }) => {
    const guide = getGuide(params.slug)
    if (!guide) throw notFound()
    return guide
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const path = `/guides/${loaderData.slug}`
    const meta = buildPageMeta({ path, title: loaderData.title, description: loaderData.description, ogType: 'article' })
    return {
      meta: meta.meta,
      links: meta.links,
      scripts: [
        jsonLdScript(
          articleJsonLd({
            title: loaderData.title,
            description: loaderData.description,
            path,
            publishedAt: loaderData.published,
            updatedAt: loaderData.updated,
            authorName: site.name,
          }),
        ),
        jsonLdScript(faqPageJsonLd(loaderData.faqs)),
        jsonLdScript(
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: loaderData.title, path },
          ]),
        ),
      ],
    }
  },
  component: GuidePage,
})

function GuidePage() {
  const guide = Route.useLoaderData()
  const [before, after] = guide.title.split(guide.accent)
  const rest = guides.filter((item) => item.slug !== guide.slug)
  const others = [...rest.filter((item) => item.topic === guide.topic), ...rest.filter((item) => item.topic !== guide.topic)].slice(0, 5)
  return (
    <div className="ds-container site-wrap guide-page">
      <SiteHead
        eyebrow="Guide"
        title={<>{before}<em>{guide.accent}</em>{after}</>}
        lede={guide.lede}
        meta={`Updated ${new Date(guide.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />
      <article className="site-prose guide-prose">
        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((text) => <p key={text}>{text}</p>)}
            {section.list ? <ul>{section.list.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </section>
        ))}
        <section>
          <h2>Questions</h2>
          {guide.faqs.map((faq) => (
            <div key={faq.question} className="guide-faq">
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </div>
          ))}
        </section>
        <p className="guide-note">This guide is general information, not financial advice.</p>
      </article>
      <div className="guide-cta">
        <p>See where your money goes, together.</p>
        <SiteCta>Start free</SiteCta>
      </div>
      <nav className="guide-more" aria-label="More guides">
        <h2>Keep reading</h2>
        <ul>
          {others.map((item) => (
            <li key={item.slug}><Link to="/guides/$slug" params={{ slug: item.slug }}>{item.label}</Link></li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
