import React from 'react'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import * as StoreReview from 'expo-store-review'
import {
  StyledPage, StyledScrollView, Stack, StyledCard, StyledPressable, useToast,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark } from '../../src/constants'
import { APP_VERSION } from '../../src/constants/app'
import { useAuthStore, usePremiumStore, useThemeStore, type ThemeMode } from '../../src/stores'
import { useAuth } from '../../src/hooks'
import { getQuotaStatus } from '../../src/utils/quota'

type Icon = keyof typeof Feather.glyphMap

const ROLE_LABEL: Record<string, string> = {
  student: 'Student', lecturer: 'Lecturer', self_learner: 'Self-learner', admin: 'Administrator',
}

const APPEARANCE: { mode: ThemeMode; label: string; icon: Icon }[] = [
  { mode: 'light',  label: 'Light',  icon: 'sun'     },
  { mode: 'dark',   label: 'Dark',   icon: 'moon'    },
  { mode: 'system', label: 'System', icon: 'smartphone' },
]

const QUOTA_ROWS: { key: string; label: string; icon: Icon }[] = [
  { key: 'chat',         label: 'AI Tutor',     icon: 'message-circle' },
  { key: 'quiz',         label: 'Quiz',         icon: 'help-circle'    },
  { key: 'flashcard',    label: 'Flashcards',   icon: 'credit-card'    },
  { key: 'summary',      label: 'Summary',      icon: 'clipboard'      },
  { key: 'general_chat', label: 'AI Assistant', icon: 'cpu'            },
]

export default function SettingsScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const user   = useAuthStore((s) => s.user)
  const { isPremium } = usePremiumStore()
  const { mode, setMode } = useThemeStore()
  const { logout, deleteAccount } = useAuth()

  const isSelfLearner = user?.role === 'self_learner'
  const initial = (user?.full_name?.trim().charAt(0) || 'S').toUpperCase()

  const [quotaData, setQuotaData] = React.useState<Record<string, { used: number; limit: number }> | null>(null)
  const isFocused = useIsFocused()
  React.useEffect(() => {
    if (!isSelfLearner || !isFocused) return
    getQuotaStatus(true, isPremium).then(setQuotaData).catch(() => {})
  }, [isSelfLearner, isPremium, isFocused])

  const rateApp = async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview()
      } else {
        toast.info('Thanks!', 'Rating opens once StudyMind is live on the App Store.')
      }
    } catch {
      toast.info('Thanks!', 'Rating is not available right now.')
    }
  }

  // A grouped list: one card, rows separated by hairlines.
  const Group = ({ children }: { children: React.ReactNode }) => (
    <StyledCard backgroundColor={C.bgCard} borderRadius={18}
      style={{ borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}
    >
      {children}
    </StyledCard>
  )

  const TONES = {
    chat:  { fg: C.chatColor,  bg: C.chatBg  },
    quiz:  { fg: C.quizColor,  bg: C.quizBg  },
    flash: { fg: C.flashColor, bg: C.flashBg },
    sum:   { fg: C.sumColor,   bg: C.sumBg   },
  }

  const Row = ({ icon, label, sub, onPress, tone, last = false }: {
    icon: Icon; label: string; sub: string; onPress: () => void; tone: keyof typeof TONES; last?: boolean
  }) => (
    <StyledPressable onPress={onPress}>
      <Stack horizontal alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={14}
        style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: C.border }}
      >
        <Stack width={40} height={40} borderRadius={12}
          backgroundColor={TONES[tone].bg}
          alignItems="center" justifyContent="center"
        >
          <Feather name={icon} size={18} color={TONES[tone].fg} />
        </Stack>
        <Stack flex={1}>
          <Text variant="label" color={C.textPrimary} fontWeight="700">{label}</Text>
          <Text variant="caption" color={C.textSecondary}>{sub}</Text>
        </Stack>
        <Feather name="chevron-right" size={16} color={C.textMuted} />
      </Stack>
    </StyledPressable>
  )

  const SectionTitle = ({ children }: { children: string }) => (
    <Text variant="body" color={C.textMuted} style={{ marginTop: 22, marginBottom: 10, paddingHorizontal: 4 }}>
      {children}
    </Text>
  )

  return (
    <StyledPage flex={1} backgroundColor={C.bg} edges={["top", "left", "right"]} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20}>
  
          <Text variant="title" color={C.textPrimary} fontWeight="800">Settings</Text>
        </Stack>
      </StyledPage.Header.Full>

      <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

        {/* StudyMind Pro: self-learners only (students and lecturers are institution-funded) */}
        {isSelfLearner && (
            <StyledPressable onPress={() => router.push('/premium' as any)}>
              <StyledCard backgroundColor={C.bgCard} borderRadius={16} padding={16}
                style={{ borderWidth: 1, borderColor: isPremium ? C.primary : C.border, marginBottom: 12 }}
              >
                <Stack horizontal alignItems="center" gap={12}>
                  <Stack width={40} height={40} borderRadius={12} backgroundColor={C.primaryBg}
                    alignItems="center" justifyContent="center"
                  >
                    <Feather name="star" size={18} color={C.primary} />
                  </Stack>
                  <Stack flex={1}>
                    <Text variant="label" color={C.textPrimary} fontWeight="700">
                      {isPremium ? 'StudyMind Pro' : 'Go Pro'}
                    </Text>
                    <Text variant="caption" color={C.textSecondary}>
                      {isPremium ? 'Unlimited AI tools, thanks for your support' : 'Unlimited AI messages, quizzes and flashcards'}
                    </Text>
                  </Stack>
                  <Feather name="chevron-right" size={16} color={C.textMuted} />
                </Stack>
              </StyledCard>
            </StyledPressable>
        )}

        {/* Profile: opens the separate Profile screen */}
        <StyledPressable onPress={() => router.push('/profile' as any)} style={{ marginBottom: 12 }}>
          <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={16}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <Stack horizontal alignItems="center" gap={14}>
              <Stack width={52} height={52} borderRadius={26} backgroundColor={C.primaryBg}
                alignItems="center" justifyContent="center"
                style={{ borderWidth: 2, borderColor: `${C.primary}40` }}
              >
                <Text variant="title" color={C.primary} fontWeight="800">{initial}</Text>
              </Stack>
              <Stack flex={1}>
                <Text variant="subtitle" color={C.textPrimary} fontWeight="700" numberOfLines={1}>
                  {user?.full_name || 'Your profile'}
                </Text>
                <Text variant="caption" color={C.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
                  {user?.email}
                </Text>
                <Stack horizontal alignItems="center" gap={5} backgroundColor={C.primaryBg} borderRadius={10}
                  paddingHorizontal={8} paddingVertical={3} style={{ alignSelf: 'flex-start', marginTop: 6 }}
                >
                  <Text variant="caption" color={C.primary} fontWeight="700" style={{ fontSize: 10 }}>
                    {ROLE_LABEL[user?.role || 'student']}
                  </Text>
                </Stack>
              </Stack>
              <Feather name="chevron-right" size={18} color={C.textMuted} />
            </Stack>
          </StyledCard>
        </StyledPressable>

        {isSelfLearner && !isPremium && quotaData && (
              <StyledCard backgroundColor={C.bgCard} borderRadius={16} padding={16}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Text variant="label" color={C.textPrimary} fontWeight="700" style={{ marginBottom: 12 }}>
                  Today's free usage
                </Text>
                <Stack gap={12}>
                  {QUOTA_ROWS.map(({ key, label, icon }) => {
                    const q = quotaData[key]
                    if (!q) return null
                    const pct   = q.limit ? Math.min(100, (q.used / q.limit) * 100) : 0
                    const color = pct >= 100 ? C.error : pct >= 70 ? C.warning : C.success
                    return (
                      <Stack key={key} gap={6}>
                        <Stack horizontal alignItems="center" justifyContent="space-between">
                          <Stack horizontal alignItems="center" gap={8}>
                            <Feather name={icon} size={14} color={C.textSecondary} />
                            <Text variant="caption" color={C.textSecondary}>{label}</Text>
                          </Stack>
                          <Text variant="caption" color={color} fontWeight="700">{q.used}/{q.limit}</Text>
                        </Stack>
                        <Stack height={5} backgroundColor={C.bgMuted} borderRadius={3} style={{ overflow: 'hidden' }}>
                          <Stack height={5} borderRadius={3} backgroundColor={color} width={`${pct}%` as any} />
                        </Stack>
                      </Stack>
                    )
                  })}
                </Stack>
              </StyledCard>
        )}

        <SectionTitle>Appearance</SectionTitle>
        <Stack horizontal gap={10}>
          {APPEARANCE.map(({ mode: m, label, icon }) => {
            const selected = mode === m
            return (
              <StyledPressable
                key={m} flex={1} onPress={() => setMode(m)}
                backgroundColor={selected ? C.primary : C.bgCard}
                borderWidth={1} borderColor={selected ? C.primary : C.border}
                borderRadius={12} paddingVertical={14} alignItems="center" gap={6}
              >
                <Feather name={icon} size={18} color={selected ? C.white : C.textSecondary} />
                <Text variant="caption" fontWeight="700" color={selected ? C.white : C.textSecondary}>{label}</Text>
              </StyledPressable>
            )
          })}
        </Stack>

        <SectionTitle>Support</SectionTitle>
        <Group>
          <Row icon="help-circle" tone="chat" label="Help & Support" sub="FAQs and contact us" onPress={() => router.push('/help' as any)} />
          <Row icon="lock" tone="flash" label="Privacy & terms" sub="How your data is handled" onPress={() => router.push('/privacy' as any)} />
          <Row icon="star" tone="sum" label="Rate StudyMind" sub="Share your feedback" onPress={rateApp} last />
        </Group>

        {/* Sign out — useAuth shows the confirm dialogue */}
        <StyledPressable
          onPress={logout} backgroundColor={C.errorBg}
          borderRadius={16} paddingVertical={16} style={{ borderWidth: 1, borderColor: `${C.error}30`, marginTop: 24 }}
        >
          <Stack horizontal alignItems="center" justifyContent="center" gap={10}>
            <Feather name="log-out" size={18} color={C.error} />
            <Text variant="label" color={C.error} fontWeight="700">Sign out</Text>
          </Stack>
        </StyledPressable>

        <StyledPressable onPress={deleteAccount} style={{ alignSelf: 'center', marginTop: 18, padding: 8 }}>
          <Text variant="caption" color={C.textMuted} fontWeight="600">Delete account</Text>
        </StyledPressable>

        <Stack alignItems="center" gap={6} style={{ marginTop: 14 }}>
          <Stack width={36} height={36} borderRadius={12} backgroundColor={C.primaryBg}
            alignItems="center" justifyContent="center"
          >
            <Feather name="book-open" size={17} color={C.primary} />
          </Stack>
          <Text variant="caption" color={C.textSecondary} fontWeight="700">StudyMind v{APP_VERSION}</Text>
          <Text variant="caption" color={C.textMuted}>Your AI-powered study assistant</Text>
        </Stack>
      </StyledScrollView>
    </StyledPage>
  )
}
