// ─── Revvo Pro configuration ────────────────────────────────────────────
//
// Gating model: free accounts have daily limits per AI feature (enforced by
// the backend, see app/quota in studymind-final); Pro removes them.

// ─── Product identifiers ─────────────────────────────────────────────────────
// Must exist as real products in App Store Connect / Play Console and be
// attached to the "premium" entitlement in the RevenueCat dashboard.
// App Store Connect prices updated to match:
// Monthly: $12.99 — com.suftnet.revvo.premium.monthly
// Yearly:  $79.99 — com.suftnet.revvo.premium.yearly
// Lifetime: REMOVED
export const PREMIUM_PRODUCTS = {
  MONTHLY: 'com.suftnet.revvo.premium.monthly',
  YEARLY:  'com.suftnet.revvo.premium.yearly',
} as const

// Fallback strings shown only until RevenueCat's live offering prices load.
export const PREMIUM_PRICING = {
  MONTHLY: { price: '$12.99', period: 'per month', label: 'Monthly' },
  YEARLY:  { price: '$79.99', period: 'per year',  label: 'Yearly', saving: 'Save 49%' },
} as const

export const PREMIUM_FEATURES = [
  {
    title:       'Unlimited AI messages',
    description: 'No daily limits on AI Tutor, Quiz, Flashcards or Summary',
  },
  {
    title:       'Unlimited modules',
    description: 'Create as many personal courses as you need',
  },
  {
    title:       'Unlimited Smart Writer',
    description: 'Essays, outlines and editing without limits',
  },
  {
    title:       'Scan & Solve unlimited',
    description: 'Scan textbooks and handwritten notes without limits',
  },
  {
    title:       'Voice input unlimited',
    description: 'Ask questions by voice without daily restrictions',
  },
  {
    title:       'Support Revvo',
    description: 'Your subscription keeps Revvo running and improving',
  },
] as const

// Revvo ships as the next version of Revvo on the App Store, so it reuses Revvo's app record:
// bundle id com.suftnet.revvo, Revvo's RevenueCat project, "premium" entitlement and the
// com.suftnet.revvo.premium.* products (existing Revvo subscribers keep their Pro).
export const PREMIUM_ENTITLEMENT_ID = 'premium'

// true = RevenueCat keeps its anonymous device identity (see identifyUser in premiumService.ts), so
// purchases made by existing Revvo customers stay attached to them.
export const PREMIUM_SHARED_TEST_PROJECT = true

export const PREMIUM_STORAGE_KEY = 'studymind_premium_entitlement'
