import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.presuply',
  appName: 'Presuply',
  webDir: 'out',
  server: {
    url: 'https://presuply.app',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
