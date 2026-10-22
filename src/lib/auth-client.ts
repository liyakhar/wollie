import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { NATIVE_API_ORIGIN, NATIVE_APP_HEADER } from '#/lib/app-origin'

export const authClient = createAuthClient({
  // Inside the iPhone app the screens are local files: sign in at the server's address.
  ...(NATIVE_API_ORIGIN ? { baseURL: NATIVE_API_ORIGIN, fetchOptions: { credentials: 'include' as const, headers: { [NATIVE_APP_HEADER]: '1' } } } : {}),
  plugins: [
    inferAdditionalFields({
      user: {
        termsAcceptedAt: { type: 'date', required: true, returned: false },
        termsVersion: { type: 'string', required: true, returned: false },
        privacyVersion: { type: 'string', required: true, returned: false },
      },
    }),
  ],
})
