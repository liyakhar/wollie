import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { unwasm } from 'unwasm/plugin'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const cloudflarePages = process.env.NITRO_PRESET === 'cloudflare_pages'
const cloudflareProjectName = process.env.CLOUDFLARE_PAGES_PROJECT || 'wollie-local-build'
const cloudflareHyperdriveId = process.env.CLOUDFLARE_HYPERDRIVE_ID?.trim()

// WOLLIE_LOCAL_HTTP=1 drops upgrade-insecure-requests so the iOS Simulator
// can load a plain-http local server. Never set it in production.
const upgradeInsecure = process.env.WOLLIE_LOCAL_HTTP === '1' ? '' : '; upgrade-insecure-requests'

const securityHeaders = {
  'content-security-policy': `default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://enablebanking.com; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'${upgradeInsecure}`,
  'permissions-policy': 'camera=(), geolocation=(), microphone=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
} as const

// The public demo is the only page intentionally embedded in Wollie's own
// landing page. It contains static example data and may be framed by this
// origin only; every other route keeps the stricter anti-framing policy.
const embeddedDemoSecurityHeaders = {
  ...securityHeaders,
  'content-security-policy': `default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: https://enablebanking.com; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'${upgradeInsecure}`,
  'x-frame-options': 'SAMEORIGIN',
} as const

function prismaCloudflareRollupShim() {
  const patch = (code: string) => {
    if (!code.includes('fileURLToPath(import.meta.url)')) return null
    let next = code
    next = next.replace(
      /globalThis\[['"]__dirname['"]\]\s*=\s*path\.dirname\(fileURLToPath\(import\.meta\.url\)\)/g,
      "globalThis['__dirname'] = '/'",
    )
    next = next.replace(
      /fileURLToPath\(import\.meta\.url\)/g,
      "fileURLToPath('file:///worker')",
    )
    return next
  }

  return {
    name: 'prisma-cloudflare-shim',
    transform(code: string) {
      const next = patch(code)
      return next ? { code: next, map: null } : null
    },
    renderChunk(code: string) {
      const next = patch(code)
      return next ? { code: next, map: null } : null
    },
  }
}

const config = defineConfig({
  envPrefix: ['VITE_', 'SITE_'],
  resolve: { tsconfigPaths: true },
  plugins: [
    ...(process.env.NODE_ENV === 'development' ? [devtools()] : []),
    unwasm({
      esmImport: cloudflarePages,
    }),
    nitro({
      routeRules: {
        '/**': { headers: securityHeaders },
        '/demo': { headers: embeddedDemoSecurityHeaders },
        '/demo/**': { headers: embeddedDemoSecurityHeaders },
        '/app/**': { headers: { ...securityHeaders, 'cache-control': 'private, no-store' } },
        '/settings/**': { headers: { ...securityHeaders, 'cache-control': 'private, no-store' } },
        '/billing/**': { headers: { ...securityHeaders, 'cache-control': 'private, no-store' } },
      },
      ...(cloudflarePages
        ? {
            preset: 'cloudflare_pages',
            cloudflare: {
              deployConfig: true,
              nodeCompat: true,
              wrangler: {
                name: cloudflareProjectName,
                ...(cloudflareHyperdriveId
                  ? {
                      hyperdrive: [
                        {
                          binding: 'HYPERDRIVE',
                          id: cloudflareHyperdriveId,
                        },
                      ],
                    }
                  : {}),
              },
            },
          }
        : {}),
      rollupConfig: {
        external: [/^@sentry\//],
        plugins: cloudflarePages ? [prismaCloudflareRollupShim()] : [],
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  ssr: {
    external: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
    noExternal: [],
  },
  optimizeDeps: {
    exclude: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  },
})

export default config
