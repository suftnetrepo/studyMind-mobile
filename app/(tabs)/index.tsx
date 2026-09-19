import React from 'react'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, getModuleColors, TOOLS } from '../../src/constants'
import { useAuthStore, useModuleStore } from '../../src/stores'
import { useModules } from '../../src/hooks'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
const ACTIVE_DAYS = [0, 1, 2, 3, 4] // Mon–Fri active this week

const TOOLS_META = {
  chat:       { emoji: '💬', label: 'AI Tutor',   desc: 'Ask questions' },
  quiz:       { emoji: '📝', label: 'AI Quiz',    desc: 'Test yourself' },
  flashcards: { emoji: '🃏', label: 'Flashcards', desc: 'Memorise terms' },
  summary:    { emoji: '📋', label: 'AI Summary', desc: 'Get overview' },
}

export default function HomeScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const user   = useAuthStore((s) => s.user)
  const { setActiveModule } = useModuleStore()
  const { data: modules, loading } = useModules()
  const hour = new Date().getHours()

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  const openModule = (mod: any, idx: number) => {
    setActiveModule(mod.id, mod.title, mod.course_code)
    router.push(`/module/${mod.id}`)
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20} horizontal alignItems="center" justifyContent="space-between">
          <Stack gap={3}>
            <Text variant="body" color={C.textSecondary}>{greeting} 👋</Text>
            <Text variant="title" color={C.textPrimary} fontWeight="800">
              Hey {firstName},
            </Text>
          </Stack>
          <StyledPressable onPress={() => router.push('/(tabs)/profile' as any)}>
            <Stack
              width={46} height={46} borderRadius={23}
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
      </StyledPage.Header.Full>

      <StyledScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        {/* Hero — study streak ─────────────────────────────────────────────── */}
        <Stack
          backgroundColor={C.navy} borderRadius={24} padding={22} marginBottom={22}
          style={{
            overflow: 'hidden',
            shadowColor: '#0d0d1a', shadowOpacity: 0.35,
            shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12,
          }}
        >
          {/* Decorative glow */}
          <Stack position="absolute" top={-80} right={-60} width={220} height={220}
            borderRadius={999} backgroundColor="rgba(91,127,255,0.1)" pointerEvents="none"
          />
          <Stack position="absolute" bottom={-40} left={-30} width={160} height={160}
            borderRadius={999} backgroundColor="rgba(139,92,246,0.07)" pointerEvents="none"
          />

          <Stack horizontal alignItems="flex-start" justifyContent="space-between" marginBottom={18}>
            <Stack gap={3}>
              <Text variant="overline" color="rgba(255,255,255,0.5)" style={{ fontSize: 10 }}>
                Study streak
              </Text>
              <Text variant="title" color="#FFFFFF" fontWeight="800">
                Activity Over 12 Days
              </Text>
            </Stack>
            <Stack
              backgroundColor="rgba(91,127,255,0.25)" borderRadius={12}
              paddingHorizontal={12} paddingVertical={7}
            >
              <Text variant="label" color="#A3BFFF" fontWeight="700">🔥 12</Text>
            </Stack>
          </Stack>

          {/* Day dots */}
          <Stack horizontal gap={6} alignItems="center">
            {DAYS.map((d, i) => {
              const isToday  = i === TODAY_IDX
              const isActive = ACTIVE_DAYS.includes(i)
              return (
                <Stack key={`${d}-${i}`} alignItems="center" gap={5} flex={1}>
                  <Text variant="caption" color="rgba(255,255,255,0.35)"
                    style={{ fontSize: 9, fontWeight: '600' }}
                  >{d}</Text>
                  <Stack
                    width={30} height={30} borderRadius={10}
                    backgroundColor={
                      isToday  ? C.primary :
                      isActive ? 'rgba(91,127,255,0.35)' :
                                 'rgba(255,255,255,0.06)'
                    }
                    alignItems="center" justifyContent="center"
                    style={isToday ? {
                      shadowColor: C.primary, shadowOpacity: 0.6,
                      shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
                    } : undefined}
                  >
                    {(isActive || isToday) && (
                      <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>✓</Text>
                    )}
                  </Stack>
                </Stack>
              )
            })}
          </Stack>

          {/* Progress bar */}
          <Stack marginTop={16} gap={6}>
            <Stack horizontal justifyContent="space-between">
              <Text variant="caption" color="rgba(255,255,255,0.4)">Weekly progress</Text>
              <Text variant="caption" color="#A3BFFF" fontWeight="700">65%</Text>
            </Stack>
            <Stack height={4} backgroundColor="rgba(255,255,255,0.1)" borderRadius={2}
              style={{ overflow: 'hidden' }}
            >
              <Stack height={4} borderRadius={2} backgroundColor={C.primary} width="65%" />
            </Stack>
          </Stack>
        </Stack>

        {/* AI Tools ──────────────────────────────────────────────────────────── */}
        <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={14}>
          <Text variant="subtitle" color={C.textPrimary} fontWeight="700">AI Tools</Text>
          <Text variant="bodySmall" color={C.primary} fontWeight="600">See all</Text>
        </Stack>

        <Stack
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}
        >
          {TOOLS.map((tool) => {
            const meta = TOOLS_META[tool.key as keyof typeof TOOLS_META]
            const colors = {
              chat:       { bg: C.chatBg,  color: C.chatColor  },
              quiz:       { bg: C.quizBg,  color: C.quizColor  },
              flashcards: { bg: C.flashBg, color: C.flashColor },
              summary:    { bg: C.sumBg,   color: C.sumColor   },
            }[tool.key] || { bg: C.primaryBg, color: C.primary }

            return (
              <StyledPressable
                key={tool.key} style={{ width: '47%' }}
                onPress={() => router.push(`/${tool.key}` as any)}
              >
                <StyledCard
                  backgroundColor={C.bgCard} borderRadius={18} padding={16}
                  style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack
                    width={48} height={48} borderRadius={14}
                    backgroundColor={colors.bg} alignItems="center" justifyContent="center"
                    marginBottom={12}
                  >
                    <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
                  </Stack>
                  <Text variant="label" color={C.textPrimary} fontWeight="700">{meta.label}</Text>
                  <Text variant="caption" color={C.textSecondary} marginTop={3}>{meta.desc}</Text>
                </StyledCard>
              </StyledPressable>
            )
          })}
        </Stack>

        {/* Continue Learning ─────────────────────────────────────────────────── */}
        <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={14}>
          <Text variant="subtitle" color={C.textPrimary} fontWeight="700">Continue Learning</Text>
          <StyledPressable onPress={() => router.push('/(tabs)/modules' as any)}>
            <Text variant="bodySmall" color={C.primary} fontWeight="600">See all</Text>
          </StyledPressable>
        </Stack>

        {loading && (
          <Stack gap={10}>
            {[1, 2].map((i) => (
              <Stack key={i} height={100} backgroundColor={C.bgMuted} borderRadius={18}
                style={{ opacity: 0.5 }}
              />
            ))}
          </Stack>
        )}

        {!loading && modules.length === 0 && (
          <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={24}
            alignItems="center" gap={10}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <Text style={{ fontSize: 36 }}>📚</Text>
            <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No modules yet</Text>
            <Text variant="body" color={C.textSecondary} textAlign="center">
              Add your first module to get started.
            </Text>
            <StyledButton
              backgroundColor={C.primary} borderRadius={12}
              paddingHorizontal={20} paddingVertical={10}
              onPress={() => router.push('/(tabs)/modules' as any)}
            >
              <Text variant="button" color={C.white}>Add module</Text>
            </StyledButton>
          </StyledCard>
        )}

        <Stack gap={10}>
          {modules.slice(0, 4).map((mod, idx) => {
            const mc      = getModuleColors(C, idx)
            const progress = 0.4 // real: from module data
            return (
              <StyledPressable key={mod.id} onPress={() => openModule(mod, idx)}>
                <StyledCard
                  backgroundColor={C.bgCard} borderRadius={18} padding={16}
                  style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack horizontal alignItems="center" gap={14}>
                    <Stack
                      width={56} height={56} borderRadius={16}
                      backgroundColor={mc.bg} alignItems="center" justifyContent="center"
                    >
                      <Text variant="overline" color={mc.color}
                        style={{ fontSize: 9, letterSpacing: 0.4 }}
                      >
                        {mod.course_code || 'MOD'}
                      </Text>
                    </Stack>
                    <Stack flex={1} gap={5}>
                      <Stack horizontal alignItems="center" justifyContent="space-between">
                        <Text variant="label" color={C.textPrimary} fontWeight="700"
                          numberOfLines={1} style={{ flex: 1, marginRight: 8 }}
                        >
                          {mod.title}
                        </Text>
                        <Text variant="caption" color={mc.color} fontWeight="700">
                          {Math.round(progress * 100)}%
                        </Text>
                      </Stack>
                      <Text variant="caption" color={C.textSecondary}>
                        {mod.document_count ?? 0} docs
                      </Text>
                      <Stack
                        height={4} backgroundColor={C.bgMuted} borderRadius={2}
                        style={{ overflow: 'hidden' }}
                      >
                        <Stack
                          height={4} borderRadius={2} backgroundColor={mc.color}
                          width={`${Math.round(progress * 100)}%` as any}
                        />
                      </Stack>
                    </Stack>
                    <Text style={{ fontSize: 18, color: C.textMuted }}>›</Text>
                  </Stack>
                </StyledCard>
              </StyledPressable>
            )
          })}
        </Stack>
      </StyledScrollView>
    </StyledPage>
  )
}
