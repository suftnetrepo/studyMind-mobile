import React, { useEffect } from 'react'
import { Platform, ScrollView, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, Stack, StyledPressable,
  StyledCard, StyledButton,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, getModuleColors } from '../../src/constants'
import { useAuthStore, useModuleStore, usePremiumStore } from '../../src/stores'
import { useModules, useAuth } from '../../src/hooks'
import { useStreak } from '../../src/hooks/useActivity'
import { getNotesByModule, initNotesDB, type Note } from '../../src/db/notes'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

const HOME_MODULE_LIMIT = 3

const NOTE_TINTS = [
  { fg: 'sumColor',   bg: 'sumBg'   },
  { fg: 'chatColor',  bg: 'chatBg'  },
  { fg: 'flashColor', bg: 'flashBg' },
  { fg: 'quizColor',  bg: 'quizBg'  },
] as const

const relativeTime = (iso: string): string => {
  const diff  = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

const QUICK_ACTIONS = [
  { key: 'chat',       icon: 'message-circle', label: 'Tutor',    route: '/chat',       fg: 'chatColor', bg: 'chatBg'  },
  { key: 'quiz',       icon: 'help-circle',    label: 'Quiz',     route: '/quiz',       fg: 'quizColor',    bg: 'quizBg'  },
  { key: 'flashcards', icon: 'credit-card',    label: 'Cards',    route: '/flashcards', fg: 'flashColor',   bg: 'flashBg' },
  { key: 'summary',    icon: 'file-text',      label: 'Summary',  route: '/summary',    fg: 'sumColor',     bg: 'sumBg'   },
] as const satisfies readonly { key: string; icon: keyof typeof Feather.glyphMap; label: string; route: string; fg: string; bg: string }[]

export default function HomeScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const user   = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const { setActiveModule, activeModuleId } = useModuleStore()
  const { data: allModules, loading, refetch: refetchModules } = useModules()
  const activeModules = React.useMemo(() => allModules.filter((m) => m.status !== 'archived'), [allModules])
  const modules = React.useMemo(() => activeModules.slice(0, HOME_MODULE_LIMIT), [activeModules])
  const { data: streak, refetch: refetchStreak } = useStreak()
  const { isPremium } = usePremiumStore()
  const isSelfLearner = user?.role === 'self_learner'
  const [refreshing, setRefreshing] = React.useState(false)

  // What to offer when there is nothing to show, by role (a self-learner has nothing to "browse").
  const emptyState = allModules.length > 0
    ? { title: 'No active modules', body: 'Everything is archived. Restore a module to see it here.', cta: 'View modules', route: '/(tabs)/modules' }
    : user?.role === 'self_learner'
    ? { title: 'Start your first course', body: 'Create a course, add your notes or documents, and study with AI.', cta: 'Create a course', route: '/setup/self-learner' }
    : user?.role === 'lecturer' || user?.role === 'admin'
    ? { title: 'Create your first module', body: 'Set up a module and upload materials for your students.', cta: 'Create a module', route: '/setup/lecturer' }
    : { title: 'Join your first module', body: 'Enter the code your lecturer shared to get started.', cta: 'Join a module', route: '/setup/student' }

  const streakDays = streak?.streak_days ?? 0
  const progress   = streak?.weekly_progress ?? 0
  const weekDots = DAYS.map((_, i) => {
    if (!streak) return false
    const d = new Date(`${streak.week_start}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return streak.week_active.includes(d.toISOString().slice(0, 10))
  })

  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  // Load recent notes for the active or first module
  const [recentNotes, setRecentNotes] = React.useState<Note[]>([])
  const notesModuleId = activeModuleId || modules[0]?.id
  const loadNotes = () => {
    if (!notesModuleId) return
    try {
      initNotesDB()
      setRecentNotes(getNotesByModule(notesModuleId).slice(0, 6))
    } catch {}
  }

  // Depends only on a primitive id, so it can never re-trigger itself.
  useEffect(() => { loadNotes() }, [notesModuleId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tabs stay mounted, so refresh when Home regains focus. The effect depends only on the focus
  // flag, and the first focus is skipped because the mount fetch already covers it.
  const isFocused = useIsFocused()
  const skipFirstFocus = React.useRef(true)
  useEffect(() => {
    if (!isFocused) return
    if (skipFirstFocus.current) { skipFirstFocus.current = false; return }
    refetchModules(true)
    loadNotes()
  }, [isFocused]) // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchModules(true), refetchStreak()])
    loadNotes()
    setRefreshing(false)
  }

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
      flex={1} backgroundColor={C.bg} edges={["top", "left", "right"]} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={24} horizontal alignItems="center" justifyContent="space-between">
          <Stack gap={1}>
            <Text variant="body" color={C.textSecondary}>{greeting}</Text>
            <Text variant="title" color={C.textMuted} >
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
            <StyledPressable onPress={() => router.push('/profile' as any)}>
              <Stack
                width={40} height={40} borderRadius={20}
                backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
              >
                <Feather name="user" size={18} color={C.textPrimary} />
              </Stack>
            </StyledPressable>
          </Stack>
        </Stack>
      </StyledPage.Header.Full>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        {/* ── Streak card ───────────────────────────────────────────── */}
        <Stack
          backgroundColor={C.bgCard} borderRadius={24} padding={20}
          marginBottom={28}
          style={{
            overflow: 'hidden', borderWidth: 1, borderColor: C.border,
            shadowColor: C.primary, shadowOpacity: 0.08,
            shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
          }}
        >
          <Stack
            position="absolute" top={-70} right={-50}
            width={200} height={200} borderRadius={999}
            backgroundColor={C.primaryBg} pointerEvents="none"
          />
          <Stack horizontal alignItems="flex-start" justifyContent="space-between" marginBottom={18}>
            <Stack gap={1} flex={1}>
             
              <Text variant="body" color={C.textPrimary} fontWeight="800" >
                {streakDays > 0 ? `${streakDays} day streak, keep it up!` : 'Build your streak'}
              </Text>
              
            </Stack>
            <Stack
              backgroundColor={C.bgCard} borderRadius={16}
              paddingHorizontal={14} paddingVertical={9} alignItems="center"
              style={{
                borderWidth: 1, borderColor: C.border,
                shadowColor: C.primary, shadowOpacity: 0.12,
                shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
              }}
            >
              <Stack horizontal alignItems="center" gap={4}>
                <Feather name="zap" size={16} color={C.primary} />
                <Text variant="subtitle" color={C.primary} fontWeight="800">{streakDays}</Text>
              </Stack>
              <Text variant="caption" color={C.textSecondary} style={{ fontSize: 10 }}>Day streak</Text>
            </Stack>
          </Stack>

          <Stack horizontal marginBottom={18}>
            {DAYS.map((d, i) => {
              const isToday  = i === TODAY_IDX
              const isActive = weekDots[i]
              return (
                <Stack key={d} alignItems="center" gap={8} flex={1}>
                  <Text style={{ fontSize: 11, color: isToday ? C.textPrimary : C.textMuted, fontWeight: '600' }}>
                    {d}
                  </Text>
                  <Stack
                    width={30} height={30} borderRadius={15}
                    backgroundColor={isActive ? C.primary : C.bgMuted}
                    style={isToday && !isActive ? { borderWidth: 2, borderColor: C.primary } : undefined}
                    alignItems="center" justifyContent="center"
                  >
                    {isActive && <Feather name="check" size={15} color={C.white} />}
                  </Stack>
                </Stack>
              )
            })}
          </Stack>

          <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={8}>
            <Text variant="body" color={C.textSecondary}>Weekly progress</Text>
            <Text variant="label" color={C.primary} fontWeight="800">{`${progress}%`}</Text>
          </Stack>
          <Stack height={7} backgroundColor={C.bgMuted} borderRadius={4} style={{ overflow: 'hidden' }}>
            <Stack height={7} borderRadius={4} backgroundColor={C.primary} width={`${progress}%`} />
          </Stack>
        </Stack>

        {/* ── AI Assistant + Smart Writer ───────────────────────────── */}
        <Stack horizontal gap={12} marginBottom={28}>
          <StyledPressable style={{ flex: 1 }} onPress={() => router.push('/general-chat' as any)}>
            <Stack
              backgroundColor={C.navy} borderRadius={20} padding={16} gap={12}
              style={{ overflow: 'hidden', minHeight: 130 }}
            >
              <Stack
                position="absolute" top={-30} right={-30}
                width={120} height={120} borderRadius={999}
                backgroundColor="rgba(91,127,255,0.15)" pointerEvents="none"
              />
              <Stack
                width={44} height={44} borderRadius={13}
                backgroundColor="rgba(91,127,255,0.3)"
                alignItems="center" justifyContent="center"
              >
                <Feather name="cpu" size={22} color="#FFFFFF" />
              </Stack>
              <Stack gap={3}>
                <Text variant="label" color="#FFFFFF" fontWeight="700">AI Assistant</Text>
                <Text variant="caption" color="rgba(255,255,255,0.6)" style={{ lineHeight: 16 }}>
                  Ask anything freely
                </Text>
              </Stack>
            </Stack>
          </StyledPressable>

          <StyledPressable style={{ flex: 1 }} onPress={() => router.push('/writing-assistant' as any)}>
            <Stack
              backgroundColor={C.primary} borderRadius={20} padding={16} gap={12}
              style={{ overflow: 'hidden', minHeight: 130 }}
            >
              <Stack
                position="absolute" top={-30} right={-30}
                width={120} height={120} borderRadius={999}
                backgroundColor="rgba(255,255,255,0.1)" pointerEvents="none"
              />
              <Stack
                width={44} height={44} borderRadius={13}
                backgroundColor="rgba(255,255,255,0.2)"
                alignItems="center" justifyContent="center"
              >
                <Feather name="edit-3" size={22} color="#FFFFFF" />
              </Stack>
              <Stack gap={3}>
                <Text variant="label" color="#FFFFFF" fontWeight="700">Smart Writer</Text>
                <Text variant="caption" color="rgba(255,255,255,0.7)" style={{ lineHeight: 16 }}>
                  Essays, outlines & editing
                </Text>
              </Stack>
            </Stack>
          </StyledPressable>
        </Stack>

        {/* ── Module cards with quick actions ──────────────────────── */}
        <Stack paddingHorizontal={16} horizontal alignItems="center" justifyContent="space-between" marginBottom={14}>
          <Text variant="body" color={C.textMuted} >
            Your modules
          </Text>
          <StyledPressable onPress={() => router.push('/(tabs)/modules' as any)}>
            <Text variant="bodySmall" color={C.primary} fontWeight="600">
              {activeModules.length > HOME_MODULE_LIMIT ? `See all (${activeModules.length})` : 'See all'}
            </Text>
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
              {emptyState.title}
            </Text>
            <Text variant="body" color={C.textSecondary} textAlign="center">
              {emptyState.body}
            </Text>
            <StyledButton
              backgroundColor={C.primary} borderRadius={12}
              paddingHorizontal={20} paddingVertical={10}
              onPress={() => router.push(emptyState.route as any)}
            >
              <Text variant="button" color={C.white}>{emptyState.cta}</Text>
            </StyledButton>
          </StyledCard>
        )}

        <Stack gap={14} marginBottom={28}>
          {modules.map((mod, idx) => {
            const mc = getModuleColors(C, idx)
            return (
              <StyledCard
                key={mod.id}
                backgroundColor={C.bgCard} borderRadius={24} padding={16} gap={16}
                style={{
                  borderWidth: 1, borderColor: C.border,
                  shadowColor: '#000', shadowOpacity: 0.05,
                  shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3,
                }}
              >
                <StyledPressable onPress={() => handleModulePress(mod)}>
                  <Stack horizontal alignItems="center" gap={14}>
                    <Stack
                      width={78} height={78} borderRadius={18}
                      backgroundColor={mc.color}
                      alignItems="center" justifyContent="center"
                      style={{ overflow: 'hidden' }}
                    >
                      <Stack
                        position="absolute" bottom={-24} right={-24}
                        width={70} height={70} borderRadius={35}
                        backgroundColor="rgba(255,255,255,0.16)" pointerEvents="none"
                      />
                      <Text variant="label" color="#FFFFFF" fontWeight="800" style={{ fontSize: 14 }}>
                        {mod.course_code || 'MOD'}
                      </Text>
                    </Stack>
                    <Stack flex={1} gap={4}>
                      <Stack horizontal alignItems="flex-start" gap={8}>
                        <Stack flex={1} gap={2}>
                          <Text variant="label" color={C.textPrimary} fontWeight="800"
                            numberOfLines={2} style={{ fontSize: 16 }}
                          >
                            {mod.title}
                          </Text>
                        </Stack>
                        <Stack
                          width={34} height={34} borderRadius={17}
                          backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
                        >
                          <Feather name="chevron-right" size={18} color={C.primary} />
                        </Stack>
                      </Stack>
                      <Text variant="caption" color={C.textSecondary}>
                        {mod.document_count ?? 0} docs
                        {mod.student_count ? ` · ${mod.student_count} students` : ''}
                      </Text>
                      <Stack horizontal alignItems="center" gap={10}>
                        <Stack flex={1} height={6} backgroundColor={C.bgMuted} borderRadius={3} style={{ overflow: 'hidden' }}>
                          <Stack height={6} borderRadius={3} backgroundColor={C.primary} width={`${mod.progress ?? 0}%`} />
                        </Stack>
                        <Text variant="caption" color={C.primary} fontWeight="700">{`${mod.progress ?? 0}%`}</Text>
                      </Stack>
                    </Stack>
                  </Stack>
                </StyledPressable>

                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {QUICK_ACTIONS.map((action) => (
                    <StyledPressable
                      key={action.key}
                      onPress={() => handleQuickAction(mod, action.route)}
                    >
                      <Stack
                        horizontal alignItems="center" gap={7}
                        backgroundColor={(C as any)[action.bg]}
                        borderRadius={50} paddingHorizontal={16} paddingVertical={10}
                      >
                        <Feather name={action.icon} size={15} color={(C as any)[action.fg]} />
                        <Text variant="caption" color={(C as any)[action.fg]} fontWeight="700" style={{ fontSize: 12 }}>
                          {action.label}
                        </Text>
                      </Stack>
                    </StyledPressable>
                  ))}
                </ScrollView>
              </StyledCard>
            )
          })}
        </Stack>

        {/* ── Recent Notes ─────────────────────────────────────────── */}
        {recentNotes.length > 0 && (
          <>
            <Stack paddingHorizontal={16} horizontal alignItems="center" justifyContent="space-between" marginBottom={14}>
              <Text variant="body" color={C.textMuted} >
                Recent notes
              </Text>
              <StyledPressable onPress={() => router.push('/notes' as any)}>
                <Text variant="bodySmall" color={C.primary} fontWeight="600">See all</Text>
              </StyledPressable>
            </Stack>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast" snapToAlignment="start"
              snapToOffsets={recentNotes.map((_, i) => i * 252)}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6, gap: 12 }}
            >
              {recentNotes.map((note, idx) => {
                const t = NOTE_TINTS[idx % NOTE_TINTS.length]
                const tint = { color: (C as any)[t.fg] as string, bg: (C as any)[t.bg] as string }
                const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0
                // The title is the first line, so preview the text after it.
                const body    = note.content.split('\n').slice(1).join(' ').replace(/\s+/g, ' ').trim()
                const preview = body.length > 90 ? `${body.slice(0, 90).trimEnd()}…` : body
                return (
                  <StyledPressable key={note.id} onPress={() => router.push(`/notes/${note.id}`)}>
                    <Stack
                      width={240} height={196} borderRadius={24} backgroundColor={tint.bg}
                      style={{ overflow: 'hidden', borderWidth: 1, borderColor: `${tint.color}1F` }}
                    >
                      <Stack flex={1} padding={14} justifyContent="space-between">
                        <Stack horizontal alignItems="flex-start" justifyContent="space-between">
                          <Stack
                            width={40} height={40} alignItems="center" justifyContent="center"
                            backgroundColor={`${tint.color}2E`}
                            style={{ borderRadius: 14, transform: [{ rotate: '8deg' }] }}
                          >
                            <Stack style={{ transform: [{ rotate: '-8deg' }] }}>
                              <Feather name="edit-3" size={18} color={tint.color} />
                            </Stack>
                          </Stack>
                          <Stack
                            backgroundColor={C.bgCard} borderRadius={100}
                            paddingHorizontal={12} paddingVertical={6}
                          >
                            <Text variant="caption" color={C.textPrimary} fontWeight="600">
                              {note.synced ? 'AI ready' : 'Not synced'}
                            </Text>
                          </Stack>
                        </Stack>
                        <Stack gap={4}>
                          <Text variant="subtitle" color={C.textPrimary} fontWeight="700"
                            numberOfLines={1} style={{ fontSize: 16, lineHeight: 22 }}
                          >
                            {note.title}
                          </Text>
                          <Text variant="caption" color={C.textSecondary}
                            numberOfLines={2} style={{ lineHeight: 18 }}
                          >
                            {preview || 'No additional text'}
                          </Text>
                        </Stack>
                      </Stack>

                      <Stack height={1} marginHorizontal={16} backgroundColor={`${tint.color}33`} />

                      <Stack horizontal alignItems="center" justifyContent="space-between" paddingHorizontal={14} paddingVertical={10}>
                        <Stack
                          backgroundColor={`${tint.color}1F`} borderRadius={12}
                          paddingHorizontal={10} paddingVertical={5}
                        >
                          <Text variant="caption" color={C.textSecondary}>
                            {wordCount} words · {relativeTime(note.updated_at)}
                          </Text>
                        </Stack>
                        <Feather name="chevron-right" size={18} color={C.textSecondary} />
                      </Stack>
                    </Stack>
                  </StyledPressable>
                )
              })}
            </ScrollView>
            <Stack height={10} />

            <StyledPressable onPress={() => router.push('/(tabs)/activity' as any)}>
              <Stack
                horizontal alignItems="center" gap={14}
                backgroundColor={C.primaryBg} borderRadius={20} padding={16}
              >
                <Stack
                  width={52} height={52} borderRadius={26}
                  backgroundColor={C.bgCard} alignItems="center" justifyContent="center"
                >
                  <Feather name="bar-chart-2" size={22} color={C.primary} />
                </Stack>
                <Stack width={1} height={36} backgroundColor={C.border} />
                <Stack flex={1} gap={2}>
                  <Text variant="label" color={C.textPrimary} fontWeight="800" style={{ fontSize: 16 }}>
                    Keep going
                  </Text>
                  <Text variant="caption" color={C.textSecondary}>
                    You're making great progress.
                  </Text>
                </Stack>
                <Feather name="chevron-right" size={20} color={C.primary} />
              </Stack>
            </StyledPressable>
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
