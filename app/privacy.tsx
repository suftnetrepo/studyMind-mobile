import React from 'react'
import { Linking, Platform } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { StyledPage, StyledScrollView, Stack, StyledCard, StyledPressable, useToast } from 'fluent-styles'
import { Text } from '../src/components/Text'
import { ScreenHeader } from '../src/components/ScreenHeader'
import { useColors, useIsDark } from '../src/constants'
import { PRIVACY_POLICY_URL, TERMS_URL } from '../src/constants/app'

type Icon = keyof typeof Feather.glyphMap

const POINTS: { icon: Icon; title: string; body: string }[] = [
  { icon: 'user',       title: 'Your account',        body: 'We store your name, email and role so you can sign in and see your courses.' },
  { icon: 'file-text',  title: 'Your study material', body: 'Documents, pasted text and scanned pages you add are stored and indexed so the AI can answer from them. Personal material is visible only to you.' },
  { icon: 'cpu',        title: 'AI processing',       body: 'Your questions and the relevant passages are sent to our AI provider to write an answer. Photos and voice recordings are converted to text for the same purpose.' },
  { icon: 'smartphone', title: 'On your device',      body: 'Written notes, theme choice and free-usage counters are kept on your phone.' },
  { icon: 'shield',     title: 'Your control',        body: 'You can edit your name in Profile and sign out at any time. To have your account and data deleted, contact support.' },
]

export default function PrivacyScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings' as any))

  const open = (url: string) =>
    Linking.openURL(url).catch(() => toast.error('Could not open link', url))

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader title="Privacy & terms" subtitle="How StudyMind handles your data" onBackPress={goBack} />
      <StyledScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Stack gap={10}>
          {POINTS.map((p) => (
            <StyledCard key={p.title} backgroundColor={C.bgCard} borderRadius={16} padding={16}
              style={{ borderWidth: 1, borderColor: C.border }}
            >
              <Stack horizontal gap={14} alignItems="flex-start">
                <Stack width={40} height={40} borderRadius={12} backgroundColor={C.primaryBg} alignItems="center" justifyContent="center">
                  <Feather name={p.icon} size={18} color={C.primary} />
                </Stack>
                <Stack flex={1} gap={4}>
                  <Text variant="label" color={C.textPrimary} fontWeight="700">{p.title}</Text>
                  <Text variant="caption" color={C.textSecondary} style={{ lineHeight: 19 }}>{p.body}</Text>
                </Stack>
              </Stack>
            </StyledCard>
          ))}
        </Stack>

        <Stack horizontal gap={10} marginTop={20}>
          {[{ label: 'Privacy Policy', url: PRIVACY_POLICY_URL }, { label: 'Terms of Use', url: TERMS_URL }].map((l) => (
            <StyledPressable key={l.label} flex={1} onPress={() => open(l.url)}
              backgroundColor={C.bgCard} borderRadius={14} paddingVertical={14} alignItems="center"
              style={{ borderWidth: 1, borderColor: C.border }}
            >
              <Stack horizontal alignItems="center" gap={6}>
                <Text variant="label" color={C.primary} fontWeight="700">{l.label}</Text>
                <Feather name="external-link" size={13} color={C.primary} />
              </Stack>
            </StyledPressable>
          ))}
        </Stack>
      </StyledScrollView>
    </StyledPage>
  )
}
