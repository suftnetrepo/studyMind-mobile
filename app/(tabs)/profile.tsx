import React from 'react'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark } from '../../src/constants'
import { useAuthStore } from '../../src/stores'
import { useAuth } from '../../src/hooks'

const ROLE_LABEL: Record<string, string> = {
  student:      'Student',
  lecturer:     'Lecturer',
  self_learner: 'Self-learner',
  admin:        'Administrator',
}

const MENU_ITEMS = [
  { emoji: '🔔', label: 'Notifications',   action: 'notifications' },
  { emoji: '🎨', label: 'Appearance',      action: 'appearance'    },
  { emoji: '🔒', label: 'Privacy',         action: 'privacy'       },
  { emoji: '❓', label: 'Help & Support',  action: 'help'          },
  { emoji: '⭐', label: 'Rate the app',    action: 'rate'          },
]

export default function ProfileScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const user   = useAuthStore((s) => s.user)

  // useAuth owns the logout confirm dialogue — no Alert here
  const { logout } = useAuth()

  const initials = user?.full_name
    ?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20}>
          <Text variant="overline" color={C.textSecondary}>Your account</Text>
          <Text variant="title" color={C.textPrimary} fontWeight="800">Profile</Text>
        </Stack>
      </StyledPage.Header.Full>

      <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* Profile hero card */}
        <StyledCard
          backgroundColor={C.navy} borderRadius={24} padding={28}
          alignItems="center" gap={12} marginBottom={24}
          style={{ overflow: 'hidden' }}
        >
          <Stack
            position="absolute" top={-60} right={-60} width={200} height={200}
            borderRadius={999} backgroundColor="rgba(91,127,255,0.1)" pointerEvents="none"
          />
          <Stack
            width={72} height={72} borderRadius={36}
            backgroundColor={C.primary} alignItems="center" justifyContent="center"
            style={{
              shadowColor: C.primary, shadowOpacity: 0.45,
              shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
            }}
          >
            <Text variant="title" color="#FFFFFF" fontWeight="800">{initials}</Text>
          </Stack>
          <Stack alignItems="center" gap={4}>
            <Text variant="subtitle" color="#FFFFFF" fontWeight="800">
              {user?.full_name || 'User'}
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.55)">{user?.email}</Text>
            <Stack
              backgroundColor="rgba(91,127,255,0.25)" borderRadius={10}
              paddingHorizontal={12} paddingVertical={5} marginTop={4}
            >
              <Text variant="caption" color="#A3BFFF" fontWeight="700">
                {ROLE_LABEL[user?.role || 'student']}
              </Text>
            </Stack>
          </Stack>
        </StyledCard>

        {/* Menu */}
        <StyledCard backgroundColor={C.bgCard} borderRadius={20}
          style={{ borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 }}
        >
          {MENU_ITEMS.map((item, idx) => (
            <StyledPressable
              key={item.action}
              onPress={() => {}}
              backgroundColor={C.bgCard}
              padding={16}
              borderBottomWidth={idx < MENU_ITEMS.length - 1 ? 1 : 0}
              borderBottomColor={C.border}
            >
              <Stack horizontal alignItems="center" gap={14}>
                <Stack
                  width={38} height={38} borderRadius={11}
                  backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
                >
                  <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                </Stack>
                <Text variant="body" color={C.textPrimary} fontWeight="500" style={{ flex: 1 }}>
                  {item.label}
                </Text>
                <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
              </Stack>
            </StyledPressable>
          ))}
        </StyledCard>

        {/* Sign out — triggers useDialogue confirm, no Alert */}
        <StyledPressable
          onPress={logout}
          backgroundColor={C.errorBg}
          borderRadius={16} padding={16}
          alignItems="center"
          style={{ borderWidth: 1, borderColor: `${C.error}30` }}
        >
          <Text variant="label" color={C.error} fontWeight="700">Sign out</Text>
        </StyledPressable>

        <Text variant="caption" color={C.textMuted} textAlign="center" marginTop={20}>
          StudyMind AI v1.0.0
        </Text>

      </StyledScrollView>
    </StyledPage>
  )
}
