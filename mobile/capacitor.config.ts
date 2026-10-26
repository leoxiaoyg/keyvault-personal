import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.keyvault.personal',
  appName: 'KeyVault Personal',
  webDir: 'www',
  android: {
    allowMixedContent: false
  },
  plugins: {
    Vault: {
      vaultFileName: 'vault.dat'
    }
  }
}

export default config
