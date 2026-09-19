import React from 'react'
import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useColors } from '../../src/constants'

const Icon = ({ name, color }: { name: keyof typeof Feather.glyphMap; color: string }) => (
  <Feather name={name} size={22} color={color} />
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
        name="activity"
        options={{
          title:      'Activity',
          tabBarIcon: ({ color }) => <Icon name="bar-chart-2" color={color} />,
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
        name="profile"
        options={{
          title:      'Profile',
          tabBarIcon: ({ color }) => <Icon name="user" color={color} />,
        }}
      />
    </Tabs>
  )
}
