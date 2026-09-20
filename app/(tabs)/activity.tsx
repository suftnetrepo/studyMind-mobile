import React from 'react'
import { Platform } from 'react-native'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { AreaChart, BarChart } from '../../src/components/MiniChart'
import { useColors, useIsDark, type ThemeColors } from '../../src/constants'
import { useStreak, useActivitySummary } from '../../src/hooks/useActivity'

type Tone = 'quiz' | 'chat' | 'flash' | 'sum' | 'primary'
type Icon = keyof typeof Feather.glyphMap

const tone = (C: ThemeColors, t: Tone) => ({
  quiz:  { color: C.quizColor,  bg: C.quizBg  },
  chat:  { color: C.chatColor,  bg: C.chatBg  },
  flash: { color: C.flashColor, bg: C.flashBg },
  sum:   { color: C.sumColor,   bg: C.sumBg   },
  primary: { color: C.primary,  bg: C.primaryBg },
}[t])

const STAT_DEFS: { icon: Icon; label: string; key: 'quiz' | 'flashcard' | 'chat' | 'summary'; tone: Tone; chart: 'area' | 'bars' }[] = [
  { icon: 'help-circle',    label: 'Quizzes taken',      key: 'quiz',      tone: 'quiz',  chart: 'area' },
  { icon: 'credit-card',    label: 'Flashcard decks',    key: 'flashcard', tone: 'chat',  chart: 'bars' },
  { icon: 'message-circle', label: 'AI conversations',   key: 'chat',      tone: 'flash', chart: 'area' },
  { icon: 'clipboard',      label: 'Summaries',          key: 'summary',   tone: 'sum',   chart: 'bars' },
]

const ACTIVITY_META: Record<string, { icon: Icon; label: string; tone: Tone }> = {
  chat:            { icon: 'message-circle', label: 'AI Tutor session',  tone: 'chat'    },
  quiz:            { icon: 'help-circle',    label: 'Quiz created',      tone: 'quiz'    },
  flashcard:       { icon: 'credit-card',    label: 'Flashcard session', tone: 'flash'   },
  summary:         { icon: 'clipboard',      label: 'Summary generated', tone: 'sum'     },
  document_upload: { icon: 'file-text',      label: 'Document uploaded', tone: 'primary' },
  notes:           { icon: 'edit-3',         label: 'Note synced to AI', tone: 'flash'   },
}

const getRelativeTime = (iso: string): string => {
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

export default function ActivityScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { data: streak }       = useStreak()
  const { data: activityData } = useActivitySummary()
  const recentActivities = streak?.recent_activities ?? []
  const STATS = STAT_DEFS.map((d) => ({ ...d, value: String(activityData?.[d.key] ?? 0) }))

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20}>
          <Text variant="overline" color={C.textSecondary}>Your progress</Text>
          <Text variant="title" color={C.textPrimary} fontWeight="800">Activity</Text>
        </Stack>
      </StyledPage.Header.Full>

      <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Stats grid */}
        <Stack style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }} marginBottom={28}>
          {STATS.map((stat, i) => {
            const t = tone(C, stat.tone)
            const chartId = `stat-chart-${i}`
            return (
              <Stack
                key={stat.label}
                backgroundColor={t.bg} borderRadius={22} padding={14}
                style={{
                  width: '47.6%', overflow: 'hidden',
                  borderWidth: 1, borderColor: `${t.color}22`,
                }}
              >
                <Stack horizontal alignItems="center" justifyContent="space-between">
                  <Stack
                    width={38} height={38} borderRadius={19}
                    backgroundColor={`${t.color}26`} alignItems="center" justifyContent="center"
                  >
                    <Feather name={stat.icon} size={18} color={t.color} />
                  </Stack>
                </Stack>

                <Text variant="metric" color={C.textPrimary} fontWeight="800"
                  style={{ fontSize: 30, lineHeight: 36, marginTop: 14 }}
                >{stat.value}</Text>
                <Text variant="caption" color={C.textSecondary} numberOfLines={1}
                  style={{ maxWidth: '62%' }}
                >{stat.label}</Text>

                <Stack
                  pointerEvents="none"
                  style={{ position: 'absolute', right: 12, bottom: 12 }}
                >
                  {stat.chart === 'area'
                    ? <AreaChart id={chartId} color={t.color} width={62} height={38} />
                    : <BarChart  id={chartId} color={t.color} width={62} height={38} />}
                </Stack>
              </Stack>
            )
          })}
        </Stack>

        {/* Recent activity */}
        <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={14}>
          <Text variant="subtitle" color={C.textPrimary} fontWeight="800">Recent activity</Text>
          <Stack horizontal alignItems="center" gap={2}>
            <Text variant="bodySmall" color={C.primary} fontWeight="600">See all</Text>
            <Feather name="chevron-right" size={15} color={C.primary} />
          </Stack>
        </Stack>

        {recentActivities.length === 0 ? (
          <StyledCard
            backgroundColor={C.bgCard} borderRadius={16} padding={24}
            alignItems="center" gap={10}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <Feather name="bar-chart-2" size={30} color={C.textMuted} />
            <Text variant="label" color={C.textPrimary} fontWeight="700">No activity yet</Text>
            <Text variant="caption" color={C.textSecondary} textAlign="center">
              Start using AI Tutor, Quiz, Flashcards or Summary to see your activity here.
            </Text>
          </StyledCard>
        ) : (
          <Stack gap={10}>
            {recentActivities.map((item) => {
              const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.chat
              const t    = tone(C, meta.tone)
              return (
                <StyledCard key={item.id} backgroundColor={C.bgCard} borderRadius={18} padding={14}
                  style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack horizontal alignItems="center" gap={14}>
                    <Stack
                      width={50} height={50} borderRadius={15}
                      backgroundColor={t.bg} alignItems="center" justifyContent="center"
                    >
                      <Feather name={meta.icon} size={21} color={t.color} />
                    </Stack>
                    <Stack flex={1} gap={3}>
                      <Text variant="label" color={C.textPrimary} fontWeight="700">{meta.label}</Text>
                      <Text variant="caption" color={C.textSecondary} numberOfLines={1}>
                        {item.course_code
                          ? `${item.course_code} · ${item.module_title}`
                          : 'General'}
                      </Text>
                    </Stack>
                    <Text variant="caption" color={C.textMuted}>{getRelativeTime(item.created_at)}</Text>
                  </Stack>
                </StyledCard>
              )
            })}
          </Stack>
        )}

        {/* Encouragement banner */}
        <Stack
          horizontal alignItems="center" gap={14}
          backgroundColor={C.primaryBg} borderRadius={20} padding={16} marginTop={16}
          style={{ borderWidth: 1, borderColor: `${C.primary}22` }}
        >
          <Stack
            width={48} height={48} borderRadius={24}
            backgroundColor={C.primary} alignItems="center" justifyContent="center"
            style={{
              shadowColor: C.primary, shadowOpacity: 0.35,
              shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
            }}
          >
            <Feather name="star" size={21} color={C.white} />
          </Stack>
          <Stack flex={1} gap={2}>
            <Text variant="label" color={C.textPrimary} fontWeight="800">
              Consistency builds confidence
            </Text>
            <Text variant="caption" color={C.textSecondary}>
              You're 3 days in a row! Keep it up.
            </Text>
          </Stack>
          <Feather name="chevron-right" size={18} color={C.primary} />
        </Stack>
      </StyledScrollView>
    </StyledPage>
  )
}
