import { useCallback, useEffect, useState } from 'react'
import { toastService, loaderService } from 'fluent-styles'
import { usePremiumStore } from '../stores'
import {
  purchaseMonthly, purchaseYearly, purchaseLifetime,
  restorePurchases, getEntitlement, getPremiumPrices,
  resetPremiumForTesting,
} from '../services/premiumService'

export function usePremium() {
  const { isPremium, plan, hydrated, setEntitlement } = usePremiumStore()
  const [prices, setPrices] = useState({
    monthlyPrice:  null as string | null,
    yearlyPrice:   null as string | null,
    lifetimePrice: null as string | null,
  })

  const refresh = useCallback(async () => {
    const info = await getEntitlement()
    setEntitlement(info.isActive, info.plan)
    return info
  }, [setEntitlement])

  // Hydrate once on first mount — cheap (cache read first), and gives
  // every screen an up-to-date answer without each one refreshing itself.
  useEffect(() => {
    if (!hydrated) refresh().catch(() => {})
  }, [hydrated, refresh])

  useEffect(() => {
    getPremiumPrices().then(setPrices).catch(() => {})
  }, [])

  const buy = useCallback(
    async (purchaseFn: () => Promise<boolean>) => {
      try {
        const activated = await purchaseFn()
        await refresh()
        if (!activated) {
          toastService.error('Purchase pending', 'It may take a moment to activate — pull to refresh or reopen the app.')
          return false
        }
        toastService.success('Welcome to Revvo Pro')
        return true
      } catch (err: any) {
        toastService.error('Purchase failed', err?.message)
        return false
      }
    },
    [refresh],
  )

  const buyMonthly  = useCallback(() => buy(purchaseMonthly),  [buy])
  const buyYearly   = useCallback(() => buy(purchaseYearly),   [buy])
  const buyLifetime = useCallback(() => buy(purchaseLifetime), [buy])

  const restore = useCallback(async () => {
    try {
      const restored = await loaderService.wrap(restorePurchases, { label: 'Restoring…', variant: 'spinner' })
      if (restored) {
        await refresh()
        toastService.success('Purchases restored')
      } else {
        toastService.info('No purchases found', 'Nothing to restore for this account')
      }
      return restored
    } catch (err: any) {
      toastService.error('Restore failed', err?.message)
      return false
    }
  }, [refresh])

  // Dev/sandbox only — mints a fresh RevenueCat identity so a purchase flow
  // can be re-tested without fighting the Keychain-persisted anonymous ID.
  // Never surfaced outside __DEV__.
  const resetForTesting = useCallback(async () => {
    await resetPremiumForTesting()
    await refresh()
    toastService.info('Identity reset', 'Fresh anonymous RevenueCat user — retry the purchase now.')
  }, [refresh])

  return {
    isPremium,
    plan,
    refresh,
    buyMonthly,
    buyYearly,
    buyLifetime,
    restore,
    resetForTesting,
    monthlyPrice:  prices.monthlyPrice,
    yearlyPrice:   prices.yearlyPrice,
    lifetimePrice: prices.lifetimePrice,
  }
}
