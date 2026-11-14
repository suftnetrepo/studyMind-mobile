/**
 * quota.ts — device-side free-tier enforcement for self-learner accounts.
 *
 * Self-learners get a fixed, never-resetting allowance per AI feature. Once
 * spent the user is directed to the web billing page to upgrade to Plus.
 * Students and lecturers are institution-funded and are never limited here.
 *
 * The backend also enforces quotas server-side (returning 429). The two
 * layers are independent: the device check prevents unnecessary round trips,
 * the backend check is the authoritative gate.
 *
 * Counts are stored per-user so accounts sharing a phone don't share limits.
 */
import * as SecureStore from 'expo-secure-store'
import { Linking } from 'react-native'
import { useAuthStore, usePremiumStore } from '../stores'
import { authService } from '../services/api'

const WEB_BILLING = 'https://studymind-web.onrender.com'

// Free-tier allowance per account, for the life of the account.
export const FREE_LIMITS: Record<string, number> = {
  chat:              15,
  quiz:              3,
  flashcard:         3,
  summary:           3,
  smart_writer:      3,
  general_chat:      10,
  scan_image:        5,
  generate_material: 1,
}

// Keys are prefixed with the user id so accounts sharing a device don't
// share counters.  The "total" prefix distinguishes from legacy daily keys.
const quotaKey = (feature: string): string => {
  const userId = useAuthStore.getState().user?.id ?? 'anon'
  return `studymind_quota_total_${userId}_${feature}`
}

const readCount = async (feature: string): Promise<number> => {
  try {
    const stored = await SecureStore.getItemAsync(quotaKey(feature))
    return stored ? parseInt(stored, 10) || 0 : 0
  } catch {
    return 0
  }
}

export async function checkQuota(
  feature: string,
  isPro: boolean,
  isSelfLearner: boolean,
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  if (!isSelfLearner || isPro) return { allowed: true, used: 0, limit: null }
  const limit = FREE_LIMITS[feature] ?? 5
  const used  = await readCount(feature)
  return { allowed: used < limit, used, limit }
}

export async function incrementQuota(feature: string): Promise<number> {
  const user = useAuthStore.getState().user
  if (user?.role !== 'self_learner' || usePremiumStore.getState().isPremium) return 0
  const next = (await readCount(feature)) + 1
  try {
    await SecureStore.setItemAsync(quotaKey(feature), String(next))
  } catch {}
  return next
}

/** Free uses remaining, or null when the user is not subject to limits. */
export async function remainingQuota(feature: string): Promise<number | null> {
  const isSelfLearner = useAuthStore.getState().user?.role === 'self_learner'
  const isPro         = usePremiumStore.getState().isPremium
  const quota = await checkQuota(feature, isPro, isSelfLearner)
  return quota.limit === null ? null : Math.max(0, quota.limit - quota.used)
}

export async function getQuotaStatus(isSelfLearner: boolean, isPro: boolean) {
  if (!isSelfLearner || isPro) return null
  const results: Record<string, { used: number; limit: number }> = {}
  for (const feature of Object.keys(FREE_LIMITS)) {
    results[feature] = { used: await readCount(feature), limit: FREE_LIMITS[feature] }
  }
  return results
}

/** Opens the web billing page via a magic link so the user is signed in
 *  seamlessly.  Falls back to the billing page root if the token request fails. */
async function openBilling(): Promise<void> {
  try {
    const { token } = await authService.magicLink()
    const url = `${WEB_BILLING}/auth/magic?token=${encodeURIComponent(token)}&redirect=/billing`
    await Linking.openURL(url)
  } catch {
    await Linking.openURL(`${WEB_BILLING}/billing`)
  }
}

/** Call before an AI request.
 *  Returns true when the action is allowed.
 *  Returns false and opens the web billing page when the device-side free
 *  limit is exhausted. */
export async function quotaGate(feature: string): Promise<boolean> {
  const isSelfLearner = useAuthStore.getState().user?.role === 'self_learner'
  const isPro         = usePremiumStore.getState().isPremium
  const quota = await checkQuota(feature, isPro, isSelfLearner)
  if (quota.allowed) return true
  // Limit reached — send the user to billing on the web.
  void openBilling()
  return false
}
