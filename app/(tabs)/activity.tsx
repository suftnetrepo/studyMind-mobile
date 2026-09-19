import React from 'react'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark } from '../../src/constants'
import { useAuthStore } from '../../src/stores'

const RECENT_ACTIVITY: { icon: keyof typeof Feather.glyphMap; label: string; sub: string; time: string; color: string }[] = [
  { icon: 'help-circle',    label: 'Completed quiz',      sub: 'CSC109 · 8/10 correct',    time: '2h ago',     color: 'quizColor'  },
  { icon: 'message-circle', label: 'AI Tutor session',    sub: 'Asked 5 questions',        time: '4h ago',     color: 'chatColor'  },
  { icon: 'credit-card',    label: 'Flashcard review',    sub: '15/20 cards mastered',     time: 'Yesterday',  color: 'flashColor' },
  { icon: 'clipboard',      label: 'Generated summary',   sub: 'CSC109 — Module overview', time: '2d ago',     color: 'sumColor'   },
  { icon: 'file-text',      label: 'Document uploaded',   sub: 'Week4_Lecture.pdf',        time: '3d ago',     color: 'primary'    },
]

const STATS: { icon: keyof typeof Feather.glyphMap; label: string; value: string }[] = [
  { icon: 'help-circle',    label: 'Quizzes taken',    value: '12' },
  { icon: 'credit-card',    label: 'Cards mastered',   value: '86' },
  { icon: 'message-circle', label: 'AI conversations', value: '24' },
  { icon: 'clipboard',      label: 'Summaries',        value: '5'  },
]

export default function ActivityScreen() {
  const C      = useColors()
  const isDark = useIsDark()

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
        <Stack style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} marginBottom={24}>
          {STATS.map((stat) => (
            <Stack
              key={stat.label}
              backgroundColor={C.bgCard} borderRadius={18} padding={18}
              style={{ borderWidth: 1, borderColor: C.border, width: '47%' }}
            >
              <Feather name={stat.icon} size={22} color={C.primary} style={{ marginBottom: 8 }} />
              <Text variant="metric" color={C.textPrimary} fontWeight="800"
                style={{ fontSize: 28, lineHeight: 32, marginBottom: 4 }}
              >{stat.value}</Text>
              <Text variant="caption" color={C.textSecondary}>{stat.label}</Text>
            </Stack>
          ))}
        </Stack>

        {/* Recent activity */}
        <Text variant="subtitle" color={C.textPrimary} fontWeight="700" marginBottom={14}>
          Recent activity
        </Text>
        <Stack gap={8}>
          {RECENT_ACTIVITY.map((item, i) => {
            const color = C[item.color as keyof typeof C] as string
            const bg    = C[`${item.color.replace('Color', 'Bg')}` as keyof typeof C] as string || C.primaryBg

            return (
              <StyledCard key={i} backgroundColor={C.bgCard} borderRadius={14} padding={14}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Stack horizontal alignItems="center" gap={12}>
                  <Stack
                    width={42} height={42} borderRadius={12}
                    backgroundColor={bg} alignItems="center" justifyContent="center"
                  >
                    <Feather name={item.icon} size={18} color={color} />
                  </Stack>
                  <Stack flex={1} gap={3}>
                    <Text variant="label" color={C.textPrimary} fontWeight="600">
                      {item.label}
                    </Text>
                    <Text variant="caption" color={C.textSecondary}>{item.sub}</Text>
                  </Stack>
                  <Text variant="caption" color={C.textMuted}>{item.time}</Text>
                </Stack>
              </StyledCard>
            )
          })}
        </Stack>
      </StyledScrollView>
    </StyledPage>
  )
}
