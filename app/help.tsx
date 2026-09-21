import React, { useState } from 'react'
import { Linking, Platform } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { StyledPage, StyledScrollView, Stack, StyledCard, StyledPressable, useToast } from 'fluent-styles'
import { Text } from '../src/components/Text'
import { ScreenHeader } from '../src/components/ScreenHeader'
import { useColors, useIsDark } from '../src/constants'
import { SUPPORT_EMAIL, APP_VERSION } from '../src/constants/app'
import { useAuthStore } from '../src/stores'

const FAQS = [
  { q: 'How do I join my lecturer\'s module?', a: 'Open the Modules tab and tap "+ Join", then enter the enrolment code your lecturer shared. Institution codes and module codes both work.' },
  { q: 'What can the AI Tutor answer?', a: 'It answers from the documents in your module and cites the source. For anything outside your course, use the AI Assistant from the Home screen.' },
  { q: 'How do I add my own study material?', a: 'In a module, open the Documents tab to upload a PDF or text file, paste text, scan a page with the camera, or write a note and sync it to the AI.' },
  { q: 'What are the free daily limits?', a: 'Self-learner accounts get a daily allowance for each AI feature, which resets every day. Revvo Pro removes the limits. Students and lecturers are never limited.' },
  { q: 'How do I restore my Pro purchase?', a: 'Open Settings, tap Go Pro, then choose "Restore purchases" using the same Apple ID you bought with.' },
  { q: 'Can I archive a finished course?', a: 'Yes. On the Modules tab tap the menu on a course and choose Archive. It leaves your Home screen but stays under Archived, and you can restore it any time.' },
]

export default function HelpScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const user   = useAuthStore((s) => s.user)
  const [open, setOpen] = useState<number | null>(0)

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings' as any))

  const contact = async () => {
    const subject = encodeURIComponent(`Revvo support (v${APP_VERSION})`)
    const body    = encodeURIComponent(`\n\n---\nAccount: ${user?.email ?? ''}\nPlatform: ${Platform.OS} ${Platform.Version}`)
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`)
    } catch {
      toast.error('No email app found', `Write to ${SUPPORT_EMAIL}`)
    }
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader title="Help & Support" subtitle="Answers and ways to reach us" onBackPress={goBack} />
      <StyledScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Text variant="body" color={C.textMuted} style={{ marginBottom: 10, paddingHorizontal: 4 }}>Frequently asked</Text>
        <Stack gap={10}>
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <StyledPressable key={f.q} onPress={() => setOpen(isOpen ? null : i)}>
                <StyledCard backgroundColor={C.bgCard} borderRadius={16} padding={16}
                  style={{ borderWidth: 1, borderColor: isOpen ? `${C.primary}55` : C.border }}
                >
                  <Stack horizontal alignItems="center" gap={12}>
                    <Text variant="label" color={C.textPrimary} fontWeight="700" style={{ flex: 1 }}>{f.q}</Text>
                    <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
                  </Stack>
                  {isOpen && (
                    <Text variant="body" color={C.textSecondary} style={{ marginTop: 10, lineHeight: 22 }}>{f.a}</Text>
                  )}
                </StyledCard>
              </StyledPressable>
            )
          })}
        </Stack>

        <StyledPressable onPress={contact} style={{ marginTop: 24 }}>
          <Stack horizontal alignItems="center" gap={14} backgroundColor={C.primary} borderRadius={18} padding={18}>
            <Stack width={44} height={44} borderRadius={14} backgroundColor="rgba(255,255,255,0.22)" alignItems="center" justifyContent="center">
              <Feather name="mail" size={20} color="#FFFFFF" />
            </Stack>
            <Stack flex={1}>
              <Text variant="label" color="#FFFFFF" fontWeight="700">Contact support</Text>
              <Text variant="caption" color="rgba(255,255,255,0.8)">We usually reply within a couple of days</Text>
            </Stack>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
          </Stack>
        </StyledPressable>
      </StyledScrollView>
    </StyledPage>
  )
}
