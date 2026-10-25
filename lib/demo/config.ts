// Demo mode configuration
// When true, app runs with mock data and no real database connection
// Safe for public deployment

export const DEMO_MODE = true

export const DEMO_CONFIG = {
  // Demo credentials (shown to users)
  credentials: {
    email: 'demo@bikesuite.net',
    password: 'demo123'
  },
  
  // Feature flags for demo
  features: {
    allowSignup: false, // Disable real signups in demo
    allowDataEdit: true, // Allow editing mock data (stored in localStorage)
    showDemoBanner: true, // Show "Demo Mode" banner
  },
  
  // Messages
  messages: {
    loginHint: 'Use demo@bikesuite.net / demo123 to login',
    demoBanner: 'Demo Mode - All data is simulated'
  }
}
