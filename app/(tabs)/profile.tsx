import React from 'react'
import { Platform } from 'react-native'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, type ThemeColors } from '../../src/constants'
import { useAuthStore } from '../../src/stores'
import { useAuth, useModules } from '../../src/hooks'

type Icon = keyof typeof Feather.glyphMap

const ROLE_META: Record<string, { label: string; icon: Icon }> = {
  student:      { label: 'Student',       icon: 'award'     },
  lecturer:     { label: 'Lecturer',      icon: 'briefcase' },
  self_learner: { label: 'Self-learner',  icon: 'book'      },
  admin:        { label: 'Administrator', icon: 'shield'    },
}

const menuItems = (C: ThemeColors): {
  icon: Icon; label: string; sub: string; action: string; color: string; bg: string
}[] => [
  { icon: 'bell',        label: 'Notifications',  sub: 'Manage your alerts and preferences', action: 'notifications', color: C.chatColor,  bg: C.chatBg  },
  { icon: 'moon',        label: 'Appearance',     sub: 'Choose your theme and display',      action: 'appearance',    color: C.quizColor,  bg: C.quizBg  },
  { icon: 'lock',        label: 'Privacy',        sub: 'Control your data and privacy',      action: 'privacy',       color: C.flashColor, bg: C.flashBg },
  { icon: 'help-circle', label: 'Help & Support', sub: 'Get help or contact us',             action: 'help',          color: C.sumColor,   bg: C.sumBg   },
  { icon: 'star',        label: 'Rate the app',   sub: 'Share your feedback',                action: 'rate',          color: C.error,      bg: C.errorBg },
]

export default function ProfileScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const user   = useAuthStore((s) => s.user)
  const { data: modules } = useModules()

  // useAuth owns the logout confirm dialogue — no Alert here
  const { logout } = useAuth()

  const initials = user?.full_name
    ?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'
  const role = ROLE_META[user?.role || 'student'] || ROLE_META.student

  const stats: { icon: Icon; value: string; label: string; color: string }[] = [
    { icon: 'book-open',   value: String(modules.length), label: 'Modules',        color: C.chatColor  },
    { icon: 'bar-chart-2', value: '86',                   label: 'Cards mastered', color: C.flashColor },
    { icon: 'clock',       value: '24',                   label: 'Study sessions', color: C.quizColor  },
  ]

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20} horizontal alignItems="center" justifyContent="space-between">
          <Stack>
            <Text variant="overline" color={C.textSecondary}>Your account</Text>
            <Text variant="title" color={C.textPrimary} fontWeight="800">Profile</Text>
          </Stack>
          <StyledPressable onPress={() => {}}>
            <Stack
              horizontal alignItems="center" gap={7}
              backgroundColor={C.bgCard} borderRadius={50}
              paddingHorizontal={16} paddingVertical={10}
              style={{
                borderWidth: 1, borderColor: C.border,
                shadowColor: C.primary, shadowOpacity: 0.12,
                shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
              }}
            >
              <Feather name="edit-2" size={14} color={C.primary} />
              <Text variant="label" color={C.primary} fontWeight="700">Edit Profile</Text>
            </Stack>
          </StyledPressable>
        </Stack>
      </StyledPage.Header.Full>

      <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* Profile hero card */}
        <StyledCard
          backgroundColor={C.bgCard} borderRadius={24} marginBottom={18}
          style={{ borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}
        >
          <Stack horizontal alignItems="center" padding={20} gap={8}>
            <Stack flex={1} gap={8}>
              <Text variant="title" color={C.textPrimary} fontWeight="800" numberOfLines={1}>
                {user?.full_name || 'User'}
              </Text>
              <Text variant="body" color={C.textSecondary} numberOfLines={1}>{user?.email}</Text>
              <Stack
                horizontal alignItems="center" gap={6}
                backgroundColor={C.primaryBg} borderRadius={12}
                paddingHorizontal={12} paddingVertical={7}
                style={{ alignSelf: 'flex-start' }}
              >
                <Feather name={role.icon} size={14} color={C.primary} />
                <Text variant="label" color={C.primary} fontWeight="700">{role.label}</Text>
              </Stack>
              <Text variant="caption" color={C.textSecondary} style={{ lineHeight: 18, marginTop: 2 }}>
                “Keep learning,{'\n'}keep growing!”
              </Text>
            </Stack>

            {/* Avatar with decorative circles */}
            <Stack width={132} height={132}>
              <Stack
                style={{ position: 'absolute', left: 0, top: 4 }}
                width={100} height={100} borderRadius={50}
                backgroundColor={`${C.primary}12`}
              />
              <Stack
                style={{ position: 'absolute', left: 14, bottom: 4 }}
                width={40} height={40} borderRadius={20}
                backgroundColor={`${C.primary}0D`}
              />
              <Stack
                style={{
                  position: 'absolute', right: 0, top: 10,
                  borderWidth: 3, borderColor: C.bgCard,
                  shadowColor: C.primary, shadowOpacity: 0.18,
                  shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6,
                }}
                width={92} height={92} borderRadius={46}
                backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
              >
                <Text variant="title" color={C.primary} fontWeight="800" style={{ fontSize: 28 }}>
                  {initials}
                </Text>
              </Stack>
              <Stack
                style={{
                  position: 'absolute', right: 2, top: 84,
                  shadowColor: '#000', shadowOpacity: 0.12,
                  shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
                }}
                width={34} height={34} borderRadius={17}
                backgroundColor={C.bgCard} alignItems="center" justifyContent="center"
              >
                <Feather name="camera" size={15} color={C.primary} />
              </Stack>
            </Stack>
          </Stack>

          {/* Stats strip */}
          <Stack
            horizontal
            style={{ borderTopWidth: 1, borderTopColor: C.border }}
          >
            {stats.map((s, i) => (
              <Stack
                key={s.label} flex={1} horizontal alignItems="center" justifyContent="center"
                gap={8} paddingVertical={16} paddingHorizontal={6}
                style={i > 0 ? { borderLeftWidth: 1, borderLeftColor: C.border } : undefined}
              >
                <Feather name={s.icon} size={20} color={s.color} />
                <Stack>
                  <Text variant="label" color={C.textPrimary} fontWeight="800">{s.value}</Text>
                  <Text variant="caption" color={C.textSecondary} style={{ fontSize: 10 }}
                    numberOfLines={1}
                  >{s.label}</Text>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </StyledCard>

        {/* Menu */}
        <StyledCard backgroundColor={C.bgCard} borderRadius={22}
          style={{ borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 18 }}
        >
          {menuItems(C).map((item, idx, arr) => (
            <StyledPressable
              key={item.action}
              onPress={() => {}}
              backgroundColor={C.bgCard}
              paddingHorizontal={16} paddingVertical={14}
              borderBottomWidth={idx < arr.length - 1 ? 1 : 0}
              borderBottomColor={C.border}
            >
              <Stack horizontal alignItems="center" gap={14}>
                <Stack
                  width={46} height={46} borderRadius={14}
                  backgroundColor={item.bg} alignItems="center" justifyContent="center"
                >
                  <Feather name={item.icon} size={20} color={item.color} />
                </Stack>
                <Stack flex={1} gap={2}>
                  <Text variant="label" color={C.textPrimary} fontWeight="700">{item.label}</Text>
                  <Text variant="caption" color={C.textSecondary}>{item.sub}</Text>
                </Stack>
                <Feather name="chevron-right" size={18} color={C.textMuted} />
              </Stack>
            </StyledPressable>
          ))}
        </StyledCard>

        {/* Sign out — triggers useDialogue confirm, no Alert */}
        <StyledPressable
          onPress={logout}
          backgroundColor={C.errorBg}
          borderRadius={18} paddingVertical={18}
          style={{ borderWidth: 1, borderColor: `${C.error}30` }}
        >
          <Stack horizontal alignItems="center" justifyContent="center" gap={10}>
            <Feather name="log-out" size={20} color={C.error} />
            <Text variant="label" color={C.error} fontWeight="700" style={{ fontSize: 16 }}>
              Sign out
            </Text>
          </Stack>
        </StyledPressable>

        <Text variant="caption" color={C.textMuted} textAlign="center" marginTop={20}>
          StudyMind AI v1.0.0
        </Text>

      </StyledScrollView>
    </StyledPage>
  )
}
