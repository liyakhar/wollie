import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { NotFoundPage } from '#/components/NotFoundPage'
import { NativeBankReturn } from '#/components/NativeBankReturn'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import {
  buildPageMeta,
  defaultHeadLinks,
  googleSiteVerificationMeta,
  jsonLdScript,
  organizationJsonLd,
} from '#/lib/seo'

interface MyRouterContext {
  queryClient: QueryClient
}

const rootMeta = buildPageMeta({ path: '/' })

export const Route = createRootRouteWithContext<MyRouterContext>()({
  notFoundComponent: NotFoundPage,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#ffffff' },
      ...googleSiteVerificationMeta(),
      ...rootMeta.meta,
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      ...defaultHeadLinks(),
    ],
    scripts: [jsonLdScript(organizationJsonLd())],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" data-theme="light" data-accent="rosin">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased [overflow-wrap:anywhere]">
        <NativeBankReturn />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
