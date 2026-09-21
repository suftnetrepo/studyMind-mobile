import React, { useState, useEffect } from 'react'
import { Linking, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledButton, StyledPressable,
} from 'fluent-styles'
import { Text } from '../src/components/Text'
import { ScreenHeader } from '../src/components/ScreenHeader'
import { useColors, useIsDark } from '../src/constants'
import { PREMIUM_FEATURES, PREMIUM_PRICING } from '../src/constants/premium'
import { usePremium } from '../src/hooks/usePremium'
import { useAuthStore } from '../src/stores'
import type { PremiumPlan } from '../src/services/premiumService'

// Reuses premiumService's own plan type (minus the "not subscribed" null
// case, which doesn't apply to a plan the user is actively picking) rather
// than a separately hand-maintained copy of the same three literals.
type PlanKey = Exclude<PremiumPlan, null>

// Source: docs/privacy.html and docs/terms.html in this repo — enable
// GitHub Pages (Settings → Pages → Source: main /docs) to serve these at
// the URLs below. Until that's turned on, these 404 — check before
// submitting to either store, both require a working privacy policy URL
// for an app with subscriptions.
const PRIVACY_POLICY_URL = 'https://suftnetrepo.github.io/studymind/privacy.html'
const TERMS_URL           = 'https://suftnetrepo.github.io/studymind/terms.html'

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))

export default function PremiumScreen() {
  const C = useColors()
  const { message, used, limit } = useLocalSearchParams<{ feature?: string; used?: string; limit?: string; message?: string }>()
  const isDark = useIsDark()
  const {
    isPremium, plan, buyMonthly, buyYearly, buyLifetime, restore, resetForTesting,
    monthlyPrice, yearlyPrice, lifetimePrice,
  } = usePremium()

  const user = useAuthStore((s) => s.user)

  // Students, lecturers and admins are institution-funded and never see the paywall.
  useEffect(() => {
    if (user && user.role !== 'self_learner') goBack()
  }, [user])

  const [selected, setSelected] = useState<PlanKey>('yearly')
  const [busy, setBusy] = useState(false)

  const PLANS: { key: PlanKey; label: string; price: string; period: string; saving?: string }[] = [
    { key: 'monthly',  label: 'Monthly',  price: monthlyPrice  ?? PREMIUM_PRICING.MONTHLY.price,  period: PREMIUM_PRICING.MONTHLY.period },
    { key: 'yearly',   label: 'Yearly',   price: yearlyPrice   ?? PREMIUM_PRICING.YEARLY.price,   period: PREMIUM_PRICING.YEARLY.period, saving: PREMIUM_PRICING.YEARLY.saving },
    { key: 'lifetime', label: 'Lifetime', price: lifetimePrice ?? PREMIUM_PRICING.LIFETIME.price, period: PREMIUM_PRICING.LIFETIME.period },
  ]

  const handleContinue = async () => {
    setBusy(true)
    try {
      const buy = selected === 'monthly' ? buyMonthly : selected === 'yearly' ? buyYearly : buyLifetime
      const ok = await buy()
      if (ok) goBack()
    } finally {
      setBusy(false)
    }
  }

  const handleRestore = async () => {
    setBusy(true)
    try {
      const ok = await restore()
      if (ok) goBack()
    } finally {
      setBusy(false)
    }
  }

  // Required subscription disclosures (Apple 3.1.2 / Play Subscriptions
  // policy): title, length, price and auto-renewal terms must be clear on
  // the purchase screen itself, plus where to manage or cancel. Both must
  // be platform-aware — a build that always says "Apple ID" is wrong (and
  // reviewable) on Android, and vice versa.
  const paymentAccountLabel = Platform.OS === 'ios' ? 'Apple ID' : 'Google Play account'
  const manageSubscriptionHint = Platform.OS === 'ios'
    ? 'Settings > your name > Subscriptions'
    : 'Google Play > Payments & subscriptions > Subscriptions'

  return (
    <StyledPage flex={1} backgroundColor={C.bg} statusBarStyle={isDark ? 'light-content' : 'dark-content'} statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}>
      <ScreenHeader title="Revvo Pro" onBackPress={goBack} />

      <StyledScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Hero */}
        <Stack alignItems="center" gap={10} style={{ marginTop: 8, marginBottom: 24 }}>
          <Stack
            width={64} height={64} borderRadius={20}
            backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
          >
            <Feather name="star" size={28} color={C.primary} />
          </Stack>
          <Text variant="title" color={C.textPrimary} fontWeight="800" textAlign="center">
            {isPremium ? 'Revvo Pro' : 'Revvo Pro'}
          </Text>
          <Text variant="body" color={C.textSecondary} textAlign="center" style={{ maxWidth: 300 }}>
            {isPremium
              ? `You're on Revvo Pro${plan ? ` · ${plan} plan` : ''}. Thanks for your support, every AI tool is unlimited.`
              : 'Unlimited AI study tools, no daily limits'}
          </Text>
        </Stack>

        {!isPremium && !!message && (
          <Stack
            horizontal alignItems="center" gap={10} backgroundColor={C.warningBg}
            borderRadius={14} padding={14} style={{ marginBottom: 20 }}
          >
            <Feather name="alert-circle" size={18} color={C.warning} />
            <Stack flex={1}>
              <Text variant="label" color={C.textPrimary} fontWeight="700">{message}</Text>
              {!!Number(limit) && (
                <Text variant="caption" color={C.textSecondary}>
                  You've used {used}/{limit} today. Free limits reset every day at midnight UTC.
                </Text>
              )}
            </Stack>
          </Stack>
        )}

        {__DEV__ && isPremium && (
          <StyledPressable
            onPress={async () => { setBusy(true); try { await resetForTesting() } finally { setBusy(false) } }}
            disabled={busy}
            style={{ alignSelf: 'center', marginBottom: 24 }}
            accessibilityRole="button" accessibilityLabel="Reset Pro status (dev only)"
          >
            <Text variant="caption" color={C.textMuted} textAlign="center">
              Dev: reset Pro status (new anonymous identity)
            </Text>
          </StyledPressable>
        )}

        {!isPremium && (
          <>
            {/* Features */}
            <StyledCard
              backgroundColor={C.bgCard} borderRadius={16} padding={16} gap={14}
              borderWidth={1} borderColor={C.border}
              style={{ marginBottom: 20 }}
            >
              {PREMIUM_FEATURES.map((f) => (
                <Stack key={f.title} horizontal alignItems="flex-start" gap={12}>
                  <Feather name="check-circle" size={18} color={C.success} />
                  <Stack flex={1} gap={1}>
                    <Text variant="label" color={C.textPrimary} fontWeight="700">{f.title}</Text>
                    <Text variant="bodySmall" color={C.textSecondary}>{f.description}</Text>
                  </Stack>
                </Stack>
              ))}
            </StyledCard>

            {/* Plans */}
            <Stack gap={10} style={{ marginBottom: 20 }}>
              {PLANS.map((p) => {
                const isSelected = selected === p.key
                return (
                  <StyledPressable key={p.key} onPress={() => setSelected(p.key)}>
                    <StyledCard
                      backgroundColor={isSelected ? C.primaryBg : C.bgCard}
                      borderRadius={14} padding={14}
                      borderWidth={1.5} borderColor={isSelected ? C.primary : C.border}
                    >
                      <Stack horizontal alignItems="center" justifyContent="space-between">
                        <Stack horizontal alignItems="center" gap={10}>
                          <Stack
                            width={20} height={20} borderRadius={10}
                            borderWidth={2} borderColor={isSelected ? C.primary : C.border}
                            backgroundColor={isSelected ? C.primary : 'transparent'}
                            alignItems="center" justifyContent="center"
                          >
                            {isSelected && <Stack width={8} height={8} borderRadius={4} backgroundColor={C.white} />}
                          </Stack>
                          <Text variant="label" color={C.textPrimary} fontWeight="700">{p.label}</Text>
                          {p.saving && (
                            <Stack backgroundColor={C.successBg} borderRadius={999} paddingHorizontal={8} paddingVertical={2}>
                              <Text variant="caption" color={C.success} fontWeight="700">{p.saving}</Text>
                            </Stack>
                          )}
                        </Stack>
                        <Stack alignItems="flex-end">
                          <Text variant="label" color={C.textPrimary} fontWeight="800">{p.price}</Text>
                          <Text variant="caption" color={C.textMuted}>{p.period}</Text>
                        </Stack>
                      </Stack>
                    </StyledCard>
                  </StyledPressable>
                )
              })}
            </Stack>

            <StyledButton
              block loading={busy}
              backgroundColor={C.primary}
              borderRadius={12} paddingVertical={14}
              onPress={handleContinue}
              style={{ marginBottom: 14 }}
            >
              <Text variant="button" color={C.white}>Continue</Text>
            </StyledButton>

            {selected === 'lifetime' && (
              <Text variant="caption" color={C.textMuted} textAlign="center" style={{ marginBottom: 14 }}>
                One-time purchase of {PLANS.find((p) => p.key === 'lifetime')!.price}. No subscription. Lifetime access forever.
              </Text>
            )}

            {(selected === 'monthly' || selected === 'yearly') && (
              <Stack gap={2} style={{ marginBottom: 14 }}>
                <Text variant="caption" color={C.textPrimary} fontWeight="600" textAlign="center">
                  {PLANS.find((p) => p.key === selected)!.price}/{selected === 'monthly' ? 'month' : 'year'},
                  {' '}billed {selected === 'monthly' ? 'monthly' : 'annually'}. Auto-renews until cancelled.
                </Text>
                <Text variant="caption" color={C.textMuted} textAlign="center">
                  Cancel anytime in {manageSubscriptionHint}.
                </Text>
              </Stack>
            )}

            {/* Restore & legal */}
            <Stack alignItems="center" gap={8}>
              <StyledPressable
                onPress={handleRestore} disabled={busy}
                accessibilityRole="button" accessibilityLabel="Restore purchases"
              >
                <Text variant="bodySmall" color={C.primary} fontWeight="600">
                  Restore purchases
                </Text>
              </StyledPressable>

              <Text variant="caption" color={C.textMuted} textAlign="center">
                Payment will be charged to your {paymentAccountLabel} at confirmation of purchase.
              </Text>

              <Stack horizontal alignItems="center" justifyContent="center" gap={10}>
                <StyledPressable
                  onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                  accessibilityRole="link" accessibilityLabel="Privacy Policy" accessibilityHint="Opens in your browser"
                >
                  <Text variant="caption" color={C.primary}>Privacy Policy</Text>
                </StyledPressable>
                <Text variant="caption" color={C.textMuted}>·</Text>
                <StyledPressable
                  onPress={() => Linking.openURL(TERMS_URL)}
                  accessibilityRole="link" accessibilityLabel="Terms of Use" accessibilityHint="Opens in your browser"
                >
                  <Text variant="caption" color={C.primary}>Terms of Use</Text>
                </StyledPressable>
              </Stack>
            </Stack>
          </>
        )}
      </StyledScrollView>
    </StyledPage>
  )
}
