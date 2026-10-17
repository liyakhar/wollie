import { createFileRoute } from '@tanstack/react-router'
import { LegalDocument, LegalSection } from '#/components/LegalDocument'
import { SitePage } from '#/components/SitePage'
import { buildPageMeta } from '#/lib/seo'
import { getLegalIdentity } from '#/server/legal'

const meta = buildPageMeta({
  path: '/legal-notice',
  title: 'Legal Notice',
  description: 'Legal publisher and hosting information for Wollie.',
})

export const Route = createFileRoute('/legal-notice')({
  head: () => ({ meta: meta.meta, links: meta.links }),
  loader: () => getLegalIdentity(),
  component: LegalNoticePage,
})

function LegalNoticePage() {
  const legal = Route.useLoaderData()
  return (
    <SitePage>
    <LegalDocument
      eyebrow="Legal"
      title="Legal Notice"
      summary="Publisher, contact, registration, and hosting information for Wollie."
      updated="July 15, 2026"
    >
      <LegalSection title="Publisher">
        <p><strong>{legal.businessName}</strong> · {legal.businessForm}</p>
        <p>{legal.businessAddress}</p>
        <p>Registration: {legal.registrationNumber}</p>
        <p>Contact: <a className="underline underline-offset-4" href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a></p>
        <p>Telephone: <a className="underline underline-offset-4" href={`tel:${legal.contactPhone}`}>{legal.contactPhone}</a></p>
      </LegalSection>
      <LegalSection title="Publication director">
        <p>{legal.publicationDirector}</p>
      </LegalSection>
      <LegalSection title="Hosting">
        <p><strong>{legal.hostName}</strong></p>
        <p>{legal.hostAddress}</p>
      </LegalSection>
      <LegalSection title="Consumer mediation">
        <p>After first contacting Wollie and attempting to resolve the complaint directly, consumers may submit an eligible unresolved dispute to:</p>
        <p>{legal.mediatorName}</p>
        <p><a className="underline underline-offset-4" href={legal.mediatorUrl} rel="noreferrer">{legal.mediatorUrl}</a></p>
      </LegalSection>
    </LegalDocument>
    </SitePage>
  )
}
