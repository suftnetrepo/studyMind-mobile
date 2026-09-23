/**
 * premiumService.ts
 *
 * Manages Revvo Pro entitlement and purchases via RevenueCat.
 *
 * ─── Gating model ──────────────────────────────────────────────────────────
 * Self-learners get daily per-feature limits, tracked on the device (src/utils/quota.ts);
 * Pro removes them. Entitlement lives entirely in RevenueCat on the device, the backend
 * never sees it. Students and lecturers are institution-funded and are never limited.
 *
 * ─── Setup still needed before this can go live ────────────────────────────
 * - iOS uses Revvo's RevenueCat project (Revvo replaces Revvo, same bundle id and
 *   "premium" entitlement). Android still needs its own products, RevenueCat mirror and
 *   "goog_" key; until then Android is treated as not premium.
 * - `react-native-purchases` needs native code — it does not run inside
 *   Expo Go. Testing purchases requires a custom dev client / EAS build
 *   (`npx expo prebuild` then `npx expo run:ios` / `run:android`, or an EAS
 *   dev build). Everything else in the app keeps working in Expo Go; every
 *   call into this file is guarded so a missing native module degrades to
 *   "not premium" instead of crashing the app.
 */
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import Purchases, { type CustomerInfo } from 'react-native-purchases'
import { PREMIUM_STORAGE_KEY, PREMIUM_ENTITLEMENT_ID, PREMIUM_SHARED_TEST_PROJECT } from '../constants/premium'

// ─── RevenueCat API keys ──────────────────────────────────────────────────────
// A RevenueCat key is tied to one store — an "appl_" key only authenticates
// against App Store Connect, a "goog_" key only against Play Console.
// These are RevenueCat's public/client keys (same category as a Stripe
// publishable key) — they're meant to ship inside the app, not secrets.
// Revvo's RevenueCat project (Revvo replaces Revvo on the App Store, same bundle id).
const IOS_API_KEY     = 'appl_XFrjSZnJQHEErLQgJFWwTdgEQlQ'
const ANDROID_API_KEY = 'goog_ahpyHxKFukUAjshLjmZaIqROlSo'

const REVENUECAT_API_KEY = Platform.select({
  ios:     IOS_API_KEY,
  android: ANDROID_API_KEY,
  default: '',
})!

export type PremiumPlan = 'monthly' | 'yearly' | 'lifetime' | null

export interface EntitlementInfo {
  isActive:    boolean
  plan:        PremiumPlan
  expiresAt:   string | null
  purchasedAt: string | null
}

const INACTIVE: EntitlementInfo = { isActive: false, plan: null, expiresAt: null, purchasedAt: null }

const getPlanFromProductId = (productId: string): PremiumPlan => {
  if (productId.includes('lifetime')) return 'lifetime'
  if (productId.includes('yearly') || productId.includes('annual')) return 'yearly'
  return 'monthly'
}

// ─── Entitlement change listeners ──────────────────────────────────────────────
// Lets usePremium react the instant RevenueCat pushes a change (renewal,
// expiration, cross-device restore, a dashboard-granted promotional
// entitlement) rather than only on the specific screens that happen to call
// getEntitlement() themselves.
const entitlementListeners = new Set<(info: EntitlementInfo) => void>()

const emitEntitlementUpdate = (info: EntitlementInfo): void => {
  for (const listener of entitlementListeners) listener(info)
}

export const subscribeToEntitlementUpdates = (
  listener: (info: EntitlementInfo) => void,
): (() => void) => {
  entitlementListeners.add(listener)
  return () => entitlementListeners.delete(listener)
}

const registerCustomerInfoListener = (): void => {
  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    syncFromCustomerInfo(customerInfo).catch((err: any) => {
      if (__DEV__) console.log('[Premium] Customer info listener sync failed:', err?.message)
    })
  })
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let initialized = false
let initFailed   = false

export const initializeRevenueCat = async (): Promise<void> => {
  if (initialized || initFailed) return

  try {
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY })
    registerCustomerInfoListener()
    initialized = true
    if (__DEV__) console.log('[Premium] RevenueCat initialized')
  } catch (err: any) {
    // Expected in Expo Go (no native module) and until real API keys are
    // set — every other caller in this file falls back to "not premium"
    // rather than throwing, so the rest of the app is unaffected.
    initFailed = true
    if (__DEV__) console.log('[Premium] RevenueCat unavailable — treating as not premium:', err?.message)
  }
}

const clearCache = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(PREMIUM_STORAGE_KEY).catch(() => {})
}

const syncFromCustomerInfo = async (customerInfo: CustomerInfo): Promise<EntitlementInfo> => {
  const entitlement = customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID]

  if (!entitlement) {
    await clearCache()
    emitEntitlementUpdate(INACTIVE)
    return INACTIVE
  }

  const info: EntitlementInfo = {
    isActive:    true,
    plan:        getPlanFromProductId(entitlement.productIdentifier || ''),
    expiresAt:   entitlement.expirationDate ?? null,
    purchasedAt: entitlement.latestPurchaseDate ?? entitlement.originalPurchaseDate ?? null,
  }
  await SecureStore.setItemAsync(PREMIUM_STORAGE_KEY, JSON.stringify(info)).catch(() => {})
  emitEntitlementUpdate(info)
  return info
}

// ─── Read entitlement ─────────────────────────────────────────────────────────

export const getEntitlement = async (): Promise<EntitlementInfo> => {
  // Cached value first, so the app has an immediate answer on launch.
  let cached: EntitlementInfo | null = null
  try {
    const raw = await SecureStore.getItemAsync(PREMIUM_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as EntitlementInfo
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        await clearCache()
      } else {
        cached = parsed
      }
    }
  } catch {
    cached = null
  }

  await initializeRevenueCat()
  if (initFailed) return cached ?? INACTIVE

  try {
    const customerInfo = await Purchases.getCustomerInfo()
    return await syncFromCustomerInfo(customerInfo)
  } catch (err: any) {
    // Offline, RC outage, etc — trust the cache rather than downgrading.
    if (__DEV__) console.log('[Premium] getCustomerInfo failed, using cache:', err?.message)
    return cached ?? INACTIVE
  }
}

export const isPremiumActive = async (): Promise<boolean> => (await getEntitlement()).isActive

// ─── Purchases ────────────────────────────────────────────────────────────────

const purchaseByPackageKey = async (
  key: 'monthly' | 'annual' | 'lifetime',
): Promise<boolean> => {
  await initializeRevenueCat()
  if (initFailed) {
    throw new Error('Purchases are unavailable in this build. Try again from the App Store / Play Store version.')
  }

  const offerings = await Purchases.getOfferings()
  const current = offerings.current
  if (!current) throw new Error('No offerings available')

  const pkg = key === 'lifetime'
    ? (current.lifetime ?? Object.values(current.availablePackages).find((p) => p.identifier.toLowerCase().includes('lifetime')))
    : current[key]

  if (!pkg) throw new Error(`${key} package not found in offerings`)

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    const result = await syncFromCustomerInfo(customerInfo)
    return result.isActive
  } catch (err: any) {
    // RevenueCat rejects purchasePackage() the same way for a user tapping
    // "Cancel" on Apple's sheet as it does for a real failure — distinguish
    // by error code so cancelling isn't treated as broken. console.info (not
    // .error) here matters: RevenueCat's own SDK already logs this via its
    // internal handler regardless of what we do, and using .error a second
    // time on our side would just double up noise in LogBox during dev.
    if (err?.code === 'PurchaseCancelledError') {
      if (__DEV__) console.info(`[Premium] ${key} purchase cancelled by user`)
      return false
    }
    if (__DEV__) console.log(`[Premium] ${key} purchase failed:`, err?.message)
    throw err
  }
}

export const purchaseMonthly = () => purchaseByPackageKey('monthly')
export const purchaseYearly  = () => purchaseByPackageKey('annual')
export const purchaseLifetime = () => purchaseByPackageKey('lifetime')

export const restorePurchases = async (): Promise<boolean> => {
  await initializeRevenueCat()
  if (initFailed) return false
  try {
    const customerInfo = await Purchases.restorePurchases()
    const result = await syncFromCustomerInfo(customerInfo)
    return result.isActive
  } catch (err: any) {
    if (__DEV__) console.log('[Premium] Restore failed:', err?.message)
    return false
  }
}

// ─── Dev-only: reset identity for testing ──────────────────────────────────────
// RevenueCat's anonymous App User ID is stored in the iOS Keychain, which
// survives app deletion on a real device — so deleting/reinstalling the app
// alone does NOT give a clean identity for re-testing a purchase flow; the
// same (now-entitled) anonymous user gets picked back up on next launch.
// Purchases.logOut() mints a genuinely new anonymous identity server-side,
// decoupled from whatever the Keychain remembers, which is what actually
// resets things. Dev/sandbox testing only — never expose this in a release
// build, it would let a real customer discard their own purchase history.
export const resetPremiumForTesting = async (): Promise<void> => {
  await initializeRevenueCat()
  if (!initFailed) {
    try {
      await Purchases.logOut()
    } catch (err: any) {
      if (__DEV__) console.log('[Premium] logOut failed (likely already anonymous):', err?.message)
    }
  }
  await clearCache()
}

// ─── Live pricing ─────────────────────────────────────────────────────────────

export interface PremiumPrices {
  monthlyPrice:  string | null
  yearlyPrice:   string | null
  lifetimePrice: string | null
}

const NO_PRICES: PremiumPrices = { monthlyPrice: null, yearlyPrice: null, lifetimePrice: null }

export const getPremiumPrices = async (): Promise<PremiumPrices> => {
  await initializeRevenueCat()
  if (initFailed) return NO_PRICES

  try {
    const offerings = await Purchases.getOfferings()
    const current = offerings.current
    if (!current) return NO_PRICES

    return {
      monthlyPrice:  current.monthly?.product.priceString  ?? null,
      yearlyPrice:   current.annual?.product.priceString   ?? null,
      lifetimePrice: current.lifetime?.product.priceString ?? null,
    }
  } catch {
    return NO_PRICES
  }
}

// ─── Identity ─────────────────────────────────────────────────────────────────
// Logging in to RevenueCat with the Revvo user id (and out on sign-out) ties a purchase
// to the account, so Pro follows the user across devices instead of one anonymous install.
export const identifyUser = async (userId: string | null): Promise<EntitlementInfo> => {
  await initializeRevenueCat()
  if (initFailed) return INACTIVE
  // Stay anonymous: logging in as a Revvo user id would detach purchases that existing Revvo
  // customers made under their anonymous RevenueCat id.
  if (PREMIUM_SHARED_TEST_PROJECT) return getEntitlement()
  try {
    if (userId) {
      const { customerInfo } = await Purchases.logIn(userId)
      return await syncFromCustomerInfo(customerInfo)
    }
    await Purchases.logOut()
  } catch (err: any) {
    if (__DEV__) console.log('[Premium] identifyUser failed:', err?.message)
  }
  await clearCache()
  emitEntitlementUpdate(INACTIVE)
  return INACTIVE
}
