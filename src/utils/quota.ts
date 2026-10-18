import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore, usePremiumStore } from '../stores'

// Free-tier allowance per account, for the life of the account: it never resets, so once it is
// spent the paywall is the only way on. Enforced on the device only, and only for self-learners:
// students and lecturers are institution-funded and never limited.
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

// Keys are per user so accounts sharing a phone don't share a counter. The "total" prefix is new,
// so counts left over from the old daily limits are ignored and everyone starts at zero.
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

// Free uses left, or null when the user isn't limited.
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

// Call before an AI request. Returns false (after opening the paywall) when the free limit is spent.
export async function quotaGate(feature: string): Promise<boolean> {
  const isSelfLearner = useAuthStore.getState().user?.role === 'self_learner'
  const isPro         = usePremiumStore.getState().isPremium
  const quota = await checkQuota(feature, isPro, isSelfLearner)
  if (quota.allowed) return true
  router.push({
    pathname: '/premium',
    params: {
      feature,
      used:    String(quota.used),
      limit:   String(quota.limit ?? 0),
      message: 'Free limit reached',
    },
  })
  return false
}
