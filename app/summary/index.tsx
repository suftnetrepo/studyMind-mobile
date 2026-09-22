import React from 'react'
import { Platform, TextInput, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton, useToast,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { EmptyState } from '../../src/components/EmptyState'
import { RichText } from '../../src/components/RichText'
import { FontSizeButton } from '../../src/components/FontSizeButton'
import { FontSizePopup } from '../../src/components/FontSizePopup'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useSummary } from '../../src/hooks'
import { useIsFocused } from '@react-navigation/native'
import { takePendingSummary } from '../../src/utils/summaryBridge'
import { copyToClipboard, shareText, formatSummaryForExport } from '../../src/utils/share'

const SCOPE_LABEL: Record<string, string> = { module: 'Full module', week: 'Current week', document: 'Latest document' }

// The API stores no title (and every summary opens with the same section headings), so title it by
// scope and preview its first point.
const summaryTitle = (scope: string) => `${SCOPE_LABEL[scope] ?? 'Module'} summary`

function summaryPreview(content: string): string {
  const line = content.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'))
  return (line || '').replace(/^[-•*]\s*/, '').replace(/[*_`]/g, '')
}

const SECTION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  'Key Concepts':                  'zap',
  'Main Arguments':                'flag',
  'Main Arguments / Explanations': 'flag',
  'Important Definitions':         'book',
  'Exam Tips':                     'target',
}

function parseMarkdown(content: string): { heading: string; lines: string[]; icon: keyof typeof Feather.glyphMap }[] {
  const sections: { heading: string; lines: string[]; icon: keyof typeof Feather.glyphMap }[] = []
  let current: { heading: string; lines: string[]; icon: keyof typeof Feather.glyphMap } | null = null

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      const heading = line.replace('## ', '').trim()
      current = { heading, icon: SECTION_ICONS[heading] || 'flag', lines: [] }
    } else if (current && line) {
      current.lines.push(line.replace(/^[-•*]\s*/, '').trim())
    }
  }
  if (current) sections.push(current)
  return sections
}

export default function SummaryScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { activeModuleId, activeCourseCode, activeModuleTitle } = useModuleStore()

  const { summary, summaries, loaded, refreshSummaries, openSummary, closeSummary, deleteSummary } = useSummary(activeModuleId)
  const toast = useToast()
  const [fontSizeOpen, setFontSizeOpen] = React.useState(false)

  // Back from the create screen: open the summary that was just made, otherwise refresh the list.
  const isFocused = useIsFocused()
  React.useEffect(() => {
    if (!isFocused || summary) return
    const id = takePendingSummary()
    if (id) openSummary(id)
    else refreshSummaries()
  }, [isFocused]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Summary list ──────────────────────────────────────────────────────────
  if (!summary) {
    const ACCENTS = [
      { fg: C.sumColor,   bg: C.sumBg   },
      { fg: C.chatColor,  bg: C.chatBg  },
      { fg: C.flashColor, bg: C.flashBg },
      { fg: C.quizColor,  bg: C.quizBg  },
    ]
    const when = (iso: string) =>
      iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''

    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="Summaries" onBackPress={() => router.back()} />

        {!activeModuleId ? (
          <Stack padding={20}>
            <EmptyState
              icon="clipboard"
              title="No module selected"
              subtitle="Open a module first, then create a structured summary."
              action={{ label: 'Browse modules', onPress: () => router.push('/(tabs)/modules' as any) }}
            />
          </Stack>
        ) : (
          <>
            <StyledScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
            >
              <Text variant="caption" color={C.textSecondary} style={{ marginBottom: 14 }}>
                {activeCourseCode ? `${activeCourseCode} · ` : ''}{activeModuleTitle}
              </Text>

              {loaded && summaries.length === 0 ? (
                <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={28}
                  alignItems="center" gap={10} style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack width={64} height={64} borderRadius={20} backgroundColor={C.sumBg} alignItems="center" justifyContent="center">
                    <Feather name="clipboard" size={28} color={C.sumColor} />
                  </Stack>
                  <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No summaries yet</Text>
                  <Text variant="body" color={C.textSecondary} textAlign="center">
                    Tap the + button to create a summary from this module's materials.
                  </Text>
                </StyledCard>
              ) : (
                <Stack gap={12}>
                  {summaries.map((s: any, i: number) => {
                    const acc   = ACCENTS[i % ACCENTS.length]
                    const title = summaryTitle(s.scope)
                    const preview = summaryPreview(s.content || '')
                    return (
                      <StyledPressable key={s.id} onPress={() => openSummary(s.id)}>
                        <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={16}
                          style={{ borderWidth: 1, borderColor: C.border }}
                        >
                          <Stack horizontal alignItems="center" gap={14}>
                            <Stack width={48} height={48} borderRadius={14} backgroundColor={acc.bg} alignItems="center" justifyContent="center">
                              <Feather name="clipboard" size={21} color={acc.fg} />
                            </Stack>
                            <Stack flex={1} gap={4}>
                              <Text variant="label" color={C.textPrimary} fontWeight="700" numberOfLines={1}>{title}</Text>
                              {!!preview && (
                                <Text variant="caption" color={C.textSecondary} numberOfLines={2} style={{ lineHeight: 17 }}>{preview}</Text>
                              )}
                              <Text variant="caption" color={C.textMuted} numberOfLines={1}>
                                {s.source_doc_count} sources · {when(s.created_at)}
                              </Text>
                            </Stack>
                            <StyledPressable hitSlop={10} onPress={() => deleteSummary(s, title)}>
                              <Feather name="trash-2" size={16} color={C.textMuted} />
                            </StyledPressable>
                          </Stack>
                        </StyledCard>
                      </StyledPressable>
                    )
                  })}
                </Stack>
              )}
            </StyledScrollView>

            {/* Create button */}
            <StyledPressable
              onPress={() => router.push('/summary/create' as any)}
              width={58} height={58} borderRadius={29}
              backgroundColor={C.sumColor} alignItems="center" justifyContent="center"
              style={{
                position: 'absolute', right: 20, bottom: Platform.OS === 'ios' ? 34 : 22,
                shadowColor: C.sumColor, shadowOpacity: 0.4, shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 }, elevation: 8,
              }}
            >
              <Feather name="plus" size={26} color={C.white} />
            </StyledPressable>
          </>
        )}
      </StyledPage>
    )
  }

  // ── Summary display ────────────────────────────────────────────────────────
  const sections = parseMarkdown(summary.content)

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader title="Summary" onBackPress={closeSummary}
        rightIcon={<FontSizeButton onPress={() => setFontSizeOpen(true)} />}
      />

      <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

        {/* Counts */}
        <Stack horizontal gap={10} marginBottom={20}>
          <Stack horizontal alignItems="center" gap={7} backgroundColor={C.sumBg}
            borderRadius={100} paddingHorizontal={14} paddingVertical={8}
          >
            <Feather name="file-text" size={14} color={C.sumColor} />
            <Text variant="caption" color={C.sumColor} fontWeight="700">
              {summary.source_doc_count} {summary.source_doc_count === 1 ? 'document' : 'documents'}
            </Text>
          </Stack>
          <Stack horizontal alignItems="center" gap={7} backgroundColor={C.chatBg}
            borderRadius={100} paddingHorizontal={14} paddingVertical={8}
          >
            <Feather name="layers" size={14} color={C.chatColor} />
            <Text variant="caption" color={C.chatColor} fontWeight="700">
              {sections.length} {sections.length === 1 ? 'section' : 'sections'}
            </Text>
          </Stack>
        </Stack>

        {/* Sections */}
        <Stack gap={12}>
          {sections.map((section, idx) => {
            const accent = [
              { fg: C.chatColor,  bg: C.chatBg  },
              { fg: C.quizColor,  bg: C.quizBg  },
              { fg: C.flashColor, bg: C.flashBg },
              { fg: C.sumColor,   bg: C.sumBg   },
            ][idx % 4]
            return (
            <StyledCard key={idx} backgroundColor={C.bgCard} borderRadius={20} padding={18}
              style={{ borderWidth: 1, borderColor: C.border }}
            >
              {/* Section header */}
              <Stack horizontal alignItems="center" gap={12} marginBottom={16}>
                <Stack
                  width={40} height={40} borderRadius={12}
                  backgroundColor={accent.bg} alignItems="center" justifyContent="center"
                >
                  <Feather name={section.icon} size={17} color={accent.fg} />
                </Stack>
                <Text variant="subtitle" color={C.textPrimary} fontWeight="700">
                  {section.heading}
                </Text>
              </Stack>

              {/* Lines */}
              <Stack gap={10}>
                {section.lines.map((line, i) => {
                  const isDefinition = section.heading.includes('Definition')
                  const colonIdx     = line.indexOf(':')
                  const hasTerm      = isDefinition && colonIdx > 0 && colonIdx < 40

                  return (
                    <Stack key={i} horizontal gap={10} alignItems="center">
                      {!isDefinition && (
                        <Stack
                          width={6} height={6} borderRadius={3}
                          backgroundColor={accent.fg}
                          style={{ flexShrink: 0 }}
                        />
                      )}
                      {hasTerm ? (
                        <Text variant="body" color={C.textSecondary}
                          style={{ flex: 1, lineHeight: 22 }}
                        >
                          <Text variant="body" color={C.textPrimary} fontWeight="700">
                            {line.slice(0, colonIdx)}:{' '}
                          </Text>
                          {line.slice(colonIdx + 1).trim()}
                        </Text>
                      ) : (
                        <Stack style={{ flex: 1 }}>
                          <RichText content={line} fontSize={13} />
                        </Stack>
                      )}
                    </Stack>
                  )
                })}
              </Stack>
            </StyledCard>
            )
          })}
        </Stack>

        {/* Back to the list */}
        <StyledButton
          backgroundColor={C.bgCard} borderRadius={16} paddingVertical={15} marginTop={20}
          borderWidth={1} borderColor={C.border}
          onPress={closeSummary}
        >
          <Text variant="button" color={C.textPrimary}>Back to summaries</Text>
        </StyledButton>

        <Stack horizontal gap={10} marginTop={10}>
          <StyledPressable
            flex={1}
            backgroundColor={C.bgCard} borderRadius={14} paddingVertical={13}
            alignItems="center" borderWidth={1} borderColor={C.border}
            onPress={() => copyToClipboard(
              formatSummaryForExport(summary, activeCourseCode || 'Module'),
              toast,
            )}
          >
            <Stack horizontal alignItems="center" gap={6}>
              <Feather name="copy" size={15} color={C.textPrimary} />
              <Text variant="label" color={C.textPrimary}>Copy</Text>
            </Stack>
          </StyledPressable>
          <StyledPressable
            flex={1}
            backgroundColor={C.primaryBg} borderRadius={14} paddingVertical={13}
            alignItems="center" borderWidth={1} borderColor={`${C.primary}30`}
            onPress={() => shareText(
              formatSummaryForExport(summary, activeCourseCode || 'Module'),
              'studymind-summary.txt',
              toast,
            )}
          >
            <Stack horizontal alignItems="center" gap={6}>
              <Feather name="share" size={15} color={C.primary} />
              <Text variant="label" color={C.primary}>Share</Text>
            </Stack>
          </StyledPressable>
        </Stack>

      </StyledScrollView>
      <FontSizePopup visible={fontSizeOpen} onClose={() => setFontSizeOpen(false)} />
    </StyledPage>
  )
}
