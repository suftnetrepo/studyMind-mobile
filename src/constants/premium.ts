// ─── StudyMind Pro configuration ────────────────────────────────────────────
//
// Gating model: free accounts have daily limits per AI feature (enforced by
// the backend, see app/quota in studymind-final); Pro removes them.

// ─── Product identifiers ─────────────────────────────────────────────────────
// Must exist as real products in App Store Connect / Play Console and be
// attached to the "premium" entitlement in the RevenueCat dashboard.
export const PREMIUM_PRODUCTS = {
  MONTHLY:  'com.suftnet.revvo.premium.monthly',
  YEARLY:   'com.suftnet.revvo.premium.yearly',
  LIFETIME: 'com.suftnet.revvo.premium.lifetime',
} as const

// Fallback strings shown only until RevenueCat's live offering prices load.
export const PREMIUM_PRICING = {
  MONTHLY:  { price: '£6.99',  period: 'per month', label: 'Monthly'  },
  YEARLY:   { price: '£39.99', period: 'per year',  label: 'Yearly', saving: 'Save 52%' },
  LIFETIME: { price: '£99.99', period: 'one-time',  label: 'Lifetime' },
} as const

export const PREMIUM_FEATURES = [
  {
    title:       'Unlimited AI messages',
    description: 'No daily limits on AI Tutor, Quiz, Flashcards, Summary or Smart Writer',
  },
  {
    title:       'Unlimited modules',
    description: 'Create as many courses as you need with no restrictions',
  },
  {
    title:       'Scan & Solve unlimited',
    description: 'Scan textbooks, handwritten notes and slides without limits',
  },
  {
    title:       'Priority AI responses',
    description: 'Your requests always go to the front of the queue',
  },
  {
    title:       'Support StudyMind',
    description: 'Your subscription keeps StudyMind running and improving',
  },
] as const

// StudyMind ships as the next version of Revvo on the App Store, so it reuses Revvo's app record:
// bundle id com.suftnet.revvo, Revvo's RevenueCat project, "premium" entitlement and the
// com.suftnet.revvo.premium.* products (existing Revvo subscribers keep their Pro).
export const PREMIUM_ENTITLEMENT_ID = 'premium'

// true = RevenueCat keeps its anonymous device identity (see identifyUser in premiumService.ts), so
// purchases made by existing Revvo customers stay attached to them.
export const PREMIUM_SHARED_TEST_PROJECT = true

export const PREMIUM_STORAGE_KEY = 'studymind_premium_entitlement'
