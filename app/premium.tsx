/**
 * premium.tsx — legacy route kept so any deep link or old push notification
 * that points to /premium still works. It immediately redirects the user to
 * the web billing page via a magic link so they are signed in seamlessly.
 *
 * No in-app purchase UI is shown. All pricing and payment is handled on the
 * web (Stripe Checkout).
 */
import React, { useEffect, useRef, useState } from 'react'
import { Linking, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { StyledPage, Stack } from 'fluent-styles'
import { Text } from '../src/components/Text'
import { ScreenHeader } from '../src/components/ScreenHeader'
import { useColors, useIsDark } from '../src/constants'
import { authService } from '../src/services/api'

const WEB_BILLING = 'https://studymind-web.onrender.com'

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))

export default function PremiumScreen() {
  const C = useColors()
  const isDark = useIsDark()
  const [error, setError] = useState<string | null>(null)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    void (async () => {
      try {
        const { token } = await authService.magicLink()
        const url = `${WEB_BILLING}/auth/magic?token=${encodeURIComponent(token)}&redirect=/billing`
        await Linking.openURL(url)
        goBack()
      } catch {
        setError('Could not open the upgrade page. Please try again.')
      }
    })()
  }, [])

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
    >
      <ScreenHeader title="StudyMind Plus" onBackPress={goBack} />

      <Stack flex={1} alignItems="center" justifyContent="center" padding={32} gap={16}>
        {error ? (
          <>
            <Text style={{ fontSize: 36 }}>⚠️</Text>
            <Text variant="label" color={C.textPrimary} fontWeight="700" style={{ textAlign: 'center' }}>
              Something went wrong
            </Text>
            <Text variant="body" color={C.textSecondary} style={{ textAlign: 'center' }}>
              {error}
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={C.primary} />
            <Text variant="body" color={C.textSecondary} style={{ textAlign: 'center' }}>
              Opening billing page…
            </Text>
          </>
        )}
      </Stack>
    </StyledPage>
  )
}
