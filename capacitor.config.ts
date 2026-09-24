import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://onie-web-production.up.railway.app/app'

const config: CapacitorConfig = {
  appId: 'com.wollie.app',
  appName: 'Wollie',
  webDir: '.output/public',
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    allowNavigation: [new URL(serverUrl).hostname],
  },
  ios: {
    backgroundColor: '#ffffff',
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
}

export default config
