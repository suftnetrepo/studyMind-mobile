/**
 * usePremium — reads Plus status from the premium store (synced from the
 * backend by premiumService.syncEntitlement on login / tab focus).
 *
 * Upgrades happen on the web; this hook no longer initiates purchases.
 */
import { usePremiumStore } from '../stores'

export function usePremium() {
  const { isPremium, hydrated } = usePremiumStore()
  return { isPremium, hydrated }
}
