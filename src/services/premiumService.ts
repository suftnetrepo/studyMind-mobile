/**
 * premiumService.ts
 *
 * Manages StudyMind Plus entitlement by querying the backend.
 *
 * ─── Gating model ──────────────────────────────────────────────────────────
 * Self-learners get a fixed per-feature free allowance tracked on the device
 * (src/utils/quota.ts). Plus removes those limits. Entitlement is owned by the
 * backend (Stripe subscription) — this module reads it on login and refreshes
 * it on demand. Students and lecturers are institution-funded and are never
 * limited.
 *
 * ─── Upgrade flow ──────────────────────────────────────────────────────────
 * Upgrades happen exclusively on the web (Stripe Checkout). When the app
 * detects a quota limit it shows QuotaModal, which opens the billing page via
 * a magic-link so the user is signed in seamlessly.
 */
import { quotaService } from './api'
import { usePremiumStore } from '../stores'
import { addMonitoringBreadcrumb, captureHandledError } from './monitoring'

/** Fetch entitlement from the backend and sync to the premium store.
 *  Returns true when the user is currently on Plus. */
export async function syncEntitlement(): Promise<boolean> {
  try {
    const status = await quotaService.status()
    const isPro = status.is_pro || status.is_institution_user
    usePremiumStore.getState().setEntitlement(isPro, isPro ? 'plus' : null)
    addMonitoringBreadcrumb('premium.synced', { is_pro: isPro })
    return isPro
  } catch (err: any) {
    captureHandledError(err, 'premium.sync_failed')
    return usePremiumStore.getState().isPremium   // keep last known value on failure
  }
}

/** Call once after login / on tab focus to keep the store up to date. */
export async function refreshEntitlement(): Promise<void> {
  await syncEntitlement()
}

/** Clear entitlement on sign-out. */
export function clearEntitlement(): void {
  usePremiumStore.getState().setEntitlement(false, null)
}
