/**
 * Premium feature copy — used in Settings to describe what Plus includes.
 * Pricing and product IDs live on the web (Stripe); this file has no
 * RevenueCat or App Store references.
 */

export const PREMIUM_FEATURES = [
  {
    title:       'Unlimited AI messages',
    description: 'No limits on AI Tutor, Quiz, Flashcards or Summary',
  },
  {
    title:       'Unlimited Smart Writer',
    description: 'Essays, outlines and editing without limits',
  },
  {
    title:       'Unlimited Scan & Solve',
    description: 'Scan textbooks and handwritten notes without limits',
  },
  {
    title:       'Unlimited voice input',
    description: 'Ask questions by voice without restrictions',
  },
  {
    title:       'Unlimited modules',
    description: 'Create as many personal courses as you need',
  },
] as const
