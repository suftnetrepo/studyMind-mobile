import React from 'react'
import { Text } from 'react-native'
import { Tabs } from 'expo-router'
import { useColors } from '../../src/constants'

// Simple icon component — mirrors nailbid's icon approach but with emoji
// since we don't have SVG icon components yet
const Icon = ({ emoji, color, focused }: { emoji: string; color: string; focused: boolean }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
)

export default function TabsLayout() {
  const C = useColors()
  return (
    <Tabs
      screenOptions={{
        headerShown:            false,
        tabBarActiveTintColor:  C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.bgCard,
          borderTopColor:  C.border,
          borderTopWidth:  0.5,
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
          tabBarIcon: ({ color, focused }) => <Icon emoji="🏠" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="modules"
        options={{
          title:      'Modules',
          tabBarIcon: ({ color, focused }) => <Icon emoji="📚" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title:      'Activity',
          tabBarIcon: ({ color, focused }) => <Icon emoji="📊" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title:      'Profile',
          tabBarIcon: ({ color, focused }) => <Icon emoji="👤" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  )
}
