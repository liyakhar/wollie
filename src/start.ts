import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { canonicalAppResponse, stagingAccessResponse } from '#/lib/staging-access'
import { bankReturnHandoffResponse } from '#/lib/native-bank-return'
import { NATIVE_API_ORIGIN, NATIVE_APP_HEADER, apiUrl } from '#/lib/app-origin'

const canonicalApp = createMiddleware().server(async ({ next, request }) => {
  return (await canonicalAppResponse(request)) || next()
})

const bankReturnHandoff = createMiddleware().server(async ({ next, request }) => {
  return bankReturnHandoffResponse(request) || next()
})

const stagingAccess = createMiddleware().server(async ({ next, request }) => {
  const denied = stagingAccessResponse(request, {
    username: process.env.STAGING_ACCESS_USERNAME,
    password: process.env.STAGING_ACCESS_PASSWORD,
  })
  return denied || next()
})

// A custom request-middleware list disables Start's implicit default, so server
// functions need explicit same-origin protection.
// The iPhone app is not a browser page on this site: its calls carry the app
// header instead, which a cross-site page cannot set without CORS approval.
const csrfProtection = createCsrfMiddleware({
  filter: (context) => context.handlerType === 'serverFn' && context.request.headers.get(NATIVE_APP_HEADER) !== '1',
})

// Inside the iPhone app the screens are local files, so server calls go to the
// Wollie server's full address. On the website this does nothing.
const nativeApi = createMiddleware({ type: 'function' }).client(async ({ next }) => {
  if (!NATIVE_API_ORIGIN) return next()
  return next({
    fetch: (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      const headers = new Headers(input instanceof Request ? input.headers : init?.headers)
      headers.set(NATIVE_APP_HEADER, '1')
      return fetch(apiUrl(url), { ...(input instanceof Request ? {} : init), method: input instanceof Request ? input.method : init?.method, body: input instanceof Request ? input.body : init?.body, headers, credentials: 'include' })
    },
  })
})

export const startInstance = createStart(() => ({
  requestMiddleware: [canonicalApp, bankReturnHandoff, stagingAccess, csrfProtection],
  functionMiddleware: [nativeApi],
}))
