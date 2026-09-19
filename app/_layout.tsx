import React, { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
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
import { useAuthStore, useThemeStore } from '../src/stores'
import { authService } from '../src/services/api'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false)

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => {
    const bootstrap = async () => {
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
          } catch {
            // Token expired or invalid — clear it so the user is sent to login
            useAuthStore.getState().logout()
          }
        }
      } catch (e) {
        console.error('[Bootstrap]', e)
      } finally {
        setAppReady(true)
      }
    }
    bootstrap()
  }, [])

  const isReady = appReady && (fontsLoaded || !!fontError)

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync()
  }, [isReady])

  if (!isReady) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalPortalProvider>
        <PortalManager>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
            <Stack.Screen name="auth/login"     options={{ headerShown: false, animation: 'fade' }} />
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
