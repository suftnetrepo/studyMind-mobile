import React, { useEffect } from 'react'
import { Tabs, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useColors } from '../../src/constants'
import { useAuthStore, usePremiumStore, getSetupDone } from '../../src/stores'
import { identifyUser } from '../../src/services/premiumService'
import { onboardingService } from '../../src/services/api'

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

  // Tie RevenueCat to the Revvo account so the backend webhook can grant Pro to this user.
  useEffect(() => {
    if (!user?.id) return
    identifyUser(user.id)
      .then((info) => usePremiumStore.getState().setEntitlement(info.isActive, info.plan))
      .catch(() => {})
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
      } catch {}
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
