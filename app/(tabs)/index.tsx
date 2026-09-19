import React, { useEffect } from 'react'
import { Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, Stack, StyledPressable,
  StyledCard, StyledButton,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, getModuleColors } from '../../src/constants'
import { useAuthStore, useModuleStore } from '../../src/stores'
import { useModules, useAuth } from '../../src/hooks'
import { getNotesByModule, initNotesDB, type Note } from '../../src/db/notes'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
const ACTIVE_DAYS = [0, 1, 2, 3, TODAY_IDX]

const QUICK_ACTIONS = [
  { key: 'chat',       icon: 'message-circle', label: 'Tutor',   route: '/chat'       },
  { key: 'quiz',       icon: 'help-circle',    label: 'Quiz',    route: '/quiz'       },
  { key: 'flashcards', icon: 'credit-card',    label: 'Cards',   route: '/flashcards' },
  { key: 'summary',    icon: 'clipboard',      label: 'Summary', route: '/summary'    },
] as const satisfies readonly { key: string; icon: keyof typeof Feather.glyphMap; label: string; route: string }[]

export default function HomeScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const user   = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const { setActiveModule, activeModuleId } = useModuleStore()
  const { data: modules, loading } = useModules()

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  // Load recent notes for the active or first module
  const [recentNotes, setRecentNotes] = React.useState<Note[]>([])
  useEffect(() => {
    const modId = activeModuleId || modules[0]?.id
    if (!modId) return
    try {
      initNotesDB()
      const notes = getNotesByModule(modId).slice(0, 6)
      setRecentNotes(notes)
    } catch {}
  }, [activeModuleId, modules])

  const handleQuickAction = (mod: any, route: string) => {
    setActiveModule(mod.id, mod.title, mod.course_code)
    router.push(route as any)
  }

  const handleModulePress = (mod: any) => {
    setActiveModule(mod.id, mod.title, mod.course_code)
    router.push(`/module/${mod.id}`)
  }

  return (
    <StyledPage
      flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20} horizontal alignItems="center" justifyContent="space-between">
          <Stack gap={2}>
            <Text variant="body" color={C.textSecondary}>{greeting} 👋</Text>
            <Text variant="title" color={C.textPrimary} fontWeight="800">
              Hey {firstName},
            </Text>
          </Stack>
          <Stack horizontal alignItems="center" gap={10}>
            <StyledPressable
              onPress={logout}
              width={40} height={40} borderRadius={20}
              backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
            >
              <Feather name="log-out" size={17} color={C.textSecondary} />
            </StyledPressable>
            <StyledPressable onPress={() => router.push('/(tabs)/profile' as any)}>
              <Stack
                width={44} height={44} borderRadius={22}
                backgroundColor={C.primary} alignItems="center" justifyContent="center"
                style={{
                  shadowColor: C.primary, shadowOpacity: 0.3,
                  shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
                }}
              >
                <Text variant="label" color={C.white} fontWeight="800">
                  {(user?.full_name?.charAt(0) || 'S').toUpperCase()}
                </Text>
              </Stack>
            </StyledPressable>
          </Stack>
        </Stack>
      </StyledPage.Header.Full>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        {/* ── Compact streak card ───────────────────────────────────── */}
        <Stack
          backgroundColor={C.primaryBg} borderRadius={20} padding={18}
          marginBottom={24}
          style={{ overflow: 'hidden', borderWidth: 1, borderColor: C.border }}
        >
          <Stack
            position="absolute" top={-60} right={-40}
            width={180} height={180} borderRadius={999}
            backgroundColor={`${C.primary}10`} pointerEvents="none"
          />
          <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={12}>
            <Stack gap={2}>
              <Text variant="overline" color={C.textSecondary} style={{ fontSize: 9 }}>
                STUDY STREAK
              </Text>
              <Text variant="subtitle" color={C.textPrimary} fontWeight="800">
                Activity Over 12 Days
              </Text>
            </Stack>
            <Stack
              backgroundColor={C.bgCard} borderRadius={10}
              paddingHorizontal={10} paddingVertical={5}
              horizontal alignItems="center" gap={4}
              style={{ borderWidth: 1, borderColor: C.border }}
            >
              <Feather name="zap" size={13} color={C.primary} />
              <Text variant="label" color={C.primary} fontWeight="800">12</Text>
            </Stack>
          </Stack>

          {/* Day dots */}
          <Stack horizontal gap={5} marginBottom={12}>
            {DAYS.map((d, i) => {
              const isToday  = i === TODAY_IDX
              const isActive = ACTIVE_DAYS.includes(i)
              return (
                <Stack key={`${d}-${i}`} alignItems="center" gap={4} flex={1}>
                  <Text style={{ fontSize: 8, color: C.textMuted, fontWeight: '600' }}>
                    {d}
                  </Text>
                  <Stack
                    width={28} height={28} borderRadius={9}
                    backgroundColor={
                      isToday  ? C.primary :
                      isActive ? `${C.primary}25` :
                                 C.bgCard
                    }
                    alignItems="center" justifyContent="center"
                  >
                    {(isActive || isToday) && (
                      <Feather name="check" size={12} color={isToday ? C.white : C.primary} />
                    )}
                  </Stack>
                </Stack>
              )
            })}
          </Stack>

          {/* Progress bar */}
          <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={5}>
            <Text variant="caption" color={C.textSecondary}>Weekly progress</Text>
            <Text variant="caption" color={C.primary} fontWeight="700">65%</Text>
          </Stack>
          <Stack height={4} backgroundColor={C.bgCard}
            borderRadius={2} style={{ overflow: 'hidden' }}
          >
            <Stack height={4} borderRadius={2} backgroundColor={C.primary} width="65%" />
          </Stack>
        </Stack>

        {/* ── Module cards with quick actions ──────────────────────── */}
        <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={14}>
          <Text variant="subtitle" color={C.textPrimary} fontWeight="800">
            Pick up where you left off
          </Text>
          <StyledPressable onPress={() => router.push('/(tabs)/modules' as any)}>
            <Text variant="bodySmall" color={C.primary} fontWeight="600">See all</Text>
          </StyledPressable>
        </Stack>

        {loading && (
          <Stack gap={12}>
            {[1, 2].map((i) => (
              <Stack key={i} height={160} backgroundColor={C.bgMuted}
                borderRadius={20} style={{ opacity: 0.4 }}
              />
            ))}
          </Stack>
        )}

        {!loading && modules.length === 0 && (
          <StyledCard
            backgroundColor={C.bgCard} borderRadius={20} padding={28}
            alignItems="center" gap={12}
            style={{ borderWidth: 1, borderColor: C.border, marginBottom: 24 }}
          >
            <Feather name="book-open" size={40} color={C.textMuted} />
            <Text variant="subtitle" color={C.textPrimary} fontWeight="700" textAlign="center">
              No modules yet
            </Text>
            <Text variant="body" color={C.textSecondary} textAlign="center">
              Join a module using your enrolment code or create your own course.
            </Text>
            <StyledButton
              backgroundColor={C.primary} borderRadius={12}
              paddingHorizontal={20} paddingVertical={10}
              onPress={() => router.push('/(tabs)/modules' as any)}
            >
              <Text variant="button" color={C.white}>Browse modules</Text>
            </StyledButton>
          </StyledCard>
        )}

        <Stack gap={14} marginBottom={28}>
          {modules.map((mod, idx) => {
            const mc = getModuleColors(C, idx)
            return (
              <StyledCard
                key={mod.id}
                backgroundColor={C.bgCard} borderRadius={20}
                style={{ borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}
              >
                {/* Coloured top accent bar */}
                <Stack height={4} backgroundColor={mc.color} />

                <Stack padding={16} gap={14}>
                  {/* Module header — tap to open module */}
                  <StyledPressable onPress={() => handleModulePress(mod)}>
                    <Stack horizontal alignItems="center" gap={12}>
                      <Stack
                        width={48} height={48} borderRadius={14}
                        backgroundColor={mc.bg}
                        alignItems="center" justifyContent="center"
                      >
                        <Text variant="overline" color={mc.color}
                          style={{ fontSize: 9, letterSpacing: 0.4, textAlign: 'center' }}
                        >
                          {mod.course_code || 'MOD'}
                        </Text>
                      </Stack>
                      <Stack flex={1} gap={3}>
                        <Text variant="label" color={C.textPrimary} fontWeight="700"
                          numberOfLines={1}
                        >
                          {mod.title}
                        </Text>
                        <Text variant="caption" color={C.textSecondary}>
                          {mod.document_count ?? 0} docs
                          {mod.student_count ? ` · ${mod.student_count} students` : ''}
                        </Text>
                      </Stack>
                      <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
                    </Stack>
                  </StyledPressable>

                  {/* Divider */}
                  <Stack height={1} backgroundColor={C.border} />

                  {/* Quick action pills */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {QUICK_ACTIONS.map((action) => (
                      <StyledPressable
                        key={action.key}
                        onPress={() => handleQuickAction(mod, action.route)}
                      >
                        <Stack
                          horizontal alignItems="center" gap={6}
                          backgroundColor={C.bgInput}
                          borderRadius={50} paddingHorizontal={14} paddingVertical={9}
                          style={{ borderWidth: 1, borderColor: C.border }}
                        >
                          <Feather name={action.icon} size={14} color={C.textSecondary} />
                          <Text variant="caption" color={C.textSecondary} fontWeight="600">
                            {action.label}
                          </Text>
                        </Stack>
                      </StyledPressable>
                    ))}
                  </ScrollView>
                </Stack>
              </StyledCard>
            )
          })}
        </Stack>

        {/* ── Recent Notes ─────────────────────────────────────────── */}
        {recentNotes.length > 0 && (
          <>
            <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={14}>
              <Text variant="subtitle" color={C.textPrimary} fontWeight="800">
                Recent notes
              </Text>
              <StyledPressable onPress={() => router.push('/notes' as any)}>
                <Text variant="bodySmall" color={C.primary} fontWeight="600">See all</Text>
              </StyledPressable>
            </Stack>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 4 }}
            >
              {recentNotes.map((note) => {
                const wordCount = note.content.trim()
                  ? note.content.trim().split(/\s+/).length : 0
                const preview   = note.content.slice(0, 80).replace(/\n/g, ' ')
                return (
                  <StyledPressable
                    key={note.id}
                    onPress={() => {
                      router.push(`/notes/${note.id}`)
                    }}
                  >
                    <Stack
                      width={160} height={152} backgroundColor={C.bgCard} borderRadius={16}
                      padding={14} gap={8}
                      style={{ borderWidth: 1, borderColor: C.border }}
                    >
                      <Stack horizontal alignItems="center" justifyContent="space-between">
                        <Stack
                          width={8} height={8} borderRadius={4}
                          backgroundColor={note.synced ? C.flashColor : C.warning}
                        />
                        <Text variant="caption" color={C.textMuted} style={{ fontSize: 9 }}>
                          {note.synced ? 'AI ready' : 'Not synced'}
                        </Text>
                      </Stack>
                      <Text variant="label" color={C.textPrimary} fontWeight="700"
                        numberOfLines={1}
                      >
                        {note.title}
                      </Text>
                      <Text variant="caption" color={C.textSecondary} numberOfLines={3}
                        style={{ lineHeight: 17, flex: 1 }}
                      >
                        {preview || 'Empty note'}
                      </Text>
                      <Text variant="caption" color={C.textMuted} style={{ fontSize: 9 }}>
                        {wordCount} words
                      </Text>
                    </Stack>
                  </StyledPressable>
                )
              })}

              {/* Add new note card */}
              <StyledPressable onPress={() => router.push('/notes' as any)}>
                <Stack
                  width={160} height={152} backgroundColor={C.primaryBg} borderRadius={16}
                  padding={14} gap={8} alignItems="center" justifyContent="center"
                  style={{ borderWidth: 1.5, borderColor: `${C.primary}40`, borderStyle: 'dashed' }}
                >
                  <Feather name="edit-3" size={22} color={C.primary} />
                  <Text variant="label" color={C.primary} fontWeight="700" textAlign="center">
                    New note
                  </Text>
                </Stack>
              </StyledPressable>
            </ScrollView>
          </>
        )}

        {/* Show notes CTA if no notes yet */}
        {recentNotes.length === 0 && modules.length > 0 && (
          <StyledPressable onPress={() => router.push('/notes' as any)}>
            <Stack
              backgroundColor={C.bgCard} borderRadius={18} padding={18}
              horizontal alignItems="center" gap={14}
              style={{ borderWidth: 1.5, borderColor: `${C.flashColor}40` }}
            >
              <Stack
                width={48} height={48} borderRadius={14}
                backgroundColor={C.flashBg} alignItems="center" justifyContent="center"
              >
                <Feather name="edit-3" size={20} color={C.flashColor} />
              </Stack>
              <Stack flex={1} gap={3}>
                <Text variant="label" color={C.textPrimary} fontWeight="700">
                  Start taking notes
                </Text>
                <Text variant="caption" color={C.textSecondary}>
                  Write notes and turn them into quizzes, flashcards and summaries with AI.
                </Text>
              </Stack>
              <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
            </Stack>
          </StyledPressable>
        )}

      </ScrollView>
    </StyledPage>
  )
}
