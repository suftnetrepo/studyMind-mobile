import React, { useEffect } from 'react'
import { Tabs, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useColors } from '../../src/constants'
import { useAuthStore, getSetupDone } from '../../src/stores'
import { refreshEntitlement } from '../../src/services/premiumService'
import { onboardingService } from '../../src/services/api'
import { captureHandledError } from '../../src/services/monitoring'

const Icon = ({ name, color }: { name: keyof typeof Feather.glyphMap; color: string }) => (
  <Feather name={name} size={22} color={color} />
)

const SETUP_ROUTES: Record<string, string> = {
  student:      '/setup/student',
  lecturer:     '/setup/lecturer',
  self_learner: '/setup/self-learner',
}

export default function TabsLayout() {
  const C = useColors()
  const user = useAuthStore((s) => s.user)

  // Sync Plus entitlement from the backend on login and whenever the user
  // comes back to the app (the subscription may have been activated on the web).
  useEffect(() => {
    if (!user?.id) return
    refreshEntitlement().catch((error) => captureHandledError(error, 'premium.refresh_entitlement'))
  }, [user?.id])

  // First launch after sign-in: send users who haven't set up their role to the right flow.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      const route = SETUP_ROUTES[user.role]
      if (!route || (await getSetupDone(user.id))) return
      try {
        const status = await onboardingService.status()
        if (!cancelled && !status.complete) router.replace(route as any)
      } catch (error) {
        captureHandledError(error, 'onboarding.status')
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, user?.role])

  return (
    <Tabs
      screenOptions={{
        headerShown:            false,
        tabBarActiveTintColor:  C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.bgCard,
          borderTopColor:  C.border,
          borderTopWidth:  0.1,
          height:          60,
          paddingBottom:   8,
          paddingTop:      6,
        },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize:   10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:      'Home',
          tabBarIcon: ({ color }) => <Icon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="modules"
        options={{
          title:      'Modules',
          tabBarIcon: ({ color }) => <Icon name="book-open" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes-tab"
        options={{
          title:      'Notes',
          tabBarIcon: ({ color }) => <Icon name="edit-3" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title:      'Settings',
          tabBarIcon: ({ color }) => <Icon name="settings" color={color} />,
        }}
      />
    </Tabs>
  )
}
