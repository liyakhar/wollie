import type { CapacitorConfig } from '@capacitor/cli'

// The app carries its screens inside it (built with WOLLIE_NATIVE=1) and talks
// to the Wollie server for data. Set CAPACITOR_SERVER_URL only to load a live
// website inside the app instead, for example a dev server while testing.
const serverUrl = process.env.CAPACITOR_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.wollie.app',
  appName: 'Wollie',
  webDir: '.output/public',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
          errorPath: 'offline.html',
          allowNavigation: [new URL(serverUrl).hostname],
        },
      }
    : {}),
  plugins: {
    // Server calls go through the phone's own networking, so sign-in cookies
    // are kept for the Wollie server and no browser cross-site rules apply.
    CapacitorHttp: { enabled: true },
  },
  ios: {
    backgroundColor: '#fbfbf9',
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
}

export default config
