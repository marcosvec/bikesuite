// Public demo configuration.
// Edits stay in browser storage. There is no account, database, or backend write.

export const DEMO_MODE = true

export const DEMO_CONFIG = {
  features: {
    allowSignup: false,
    allowDataEdit: true,
    showDemoBanner: true,
  },
  messages: {
    demoBanner: 'Demo data is saved locally in this browser. No account or external services are required.',
  },
}
