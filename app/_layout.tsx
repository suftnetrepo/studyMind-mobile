import React, { useEffect, useState } from 'react'
import { Stack, router } from 'expo-router'
import { GlobalPortalProvider, PortalManager } from 'fluent-styles'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { useAuthStore, useThemeStore, getOnboardingSeen } from '../src/stores'
import { authService } from '../src/services/api'

SplashScreen.preventAutoHideAsync()

type InitialRoute = '/(tabs)' | '/onboarding' | '/auth/login'

export default function RootLayout() {
  const [appReady, setAppReady]     = useState(false)
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null)
  const [navigated, setNavigated]   = useState(false)

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => {
    const bootstrap = async () => {
      let authed = false
      try {
        await Promise.all([
          useThemeStore.getState().hydrate(),
          useAuthStore.getState().hydrate(),
        ])

        const { accessToken } = useAuthStore.getState()
        if (accessToken) {
          try {
            const me = await authService.me()
            useAuthStore.getState().setUser(me as any)
            authed = true
          } catch {
            // Token expired or invalid — clear it so the user is sent to login
            useAuthStore.getState().logout()
          }
        }

        if (authed) {
          setInitialRoute('/(tabs)')
        } else {
          const seenOnboarding = await getOnboardingSeen()
          setInitialRoute(seenOnboarding ? '/auth/login' : '/onboarding')
        }
      } catch (e) {
        console.error('[Bootstrap]', e)
        setInitialRoute('/auth/login')
      } finally {
        setAppReady(true)
      }
    }
    bootstrap()
  }, [])

  const isReady = appReady && (fontsLoaded || !!fontError) && initialRoute !== null

  // Issue the redirect (if any) while the native splash screen is still
  // covering the app, then only hide it once navigation has happened — this
  // avoids a visible flash of the default (tabs) route before we redirect
  // an unauthenticated or first-time user to onboarding/login.
  useEffect(() => {
    if (isReady && !navigated) {
      if (initialRoute && initialRoute !== '/(tabs)') {
        router.replace(initialRoute as any)
      }
      setNavigated(true)
    }
  }, [isReady, navigated, initialRoute])

  useEffect(() => {
    if (navigated) SplashScreen.hideAsync()
  }, [navigated])

  if (!isReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalPortalProvider>
        <PortalManager>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
            <Stack.Screen name="onboarding"     options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="auth/login"     options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="auth/register"  options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="module/[id]"    options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="chat/index"     options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="quiz/index"     options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="flashcards/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="summary/index"  options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="notes/index"    options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="notes/[id]"     options={{ headerShown: false, animation: 'slide_from_right' }} />
          </Stack>
        </PortalManager>
      </GlobalPortalProvider>
    </GestureHandlerRootView>
  )
}
