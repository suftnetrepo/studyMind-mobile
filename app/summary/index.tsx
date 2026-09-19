import React from 'react'
import { Platform, TextInput } from 'react-native'
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
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useSummary, type SummaryScope } from '../../src/hooks'
import { copyToClipboard, shareText, formatSummaryForExport } from '../../src/utils/share'

const SCOPE_OPTIONS: {
  key: SummaryScope; label: string; emoji: string; desc: string
}[] = [
  { key: 'module',   label: 'Full module',     emoji: '📚', desc: 'All materials in this module' },
  { key: 'week',     label: 'Current week',    emoji: '📅', desc: "This week's uploaded materials" },
  { key: 'document', label: 'Latest document', emoji: '📄', desc: 'The most recently uploaded file' },
]

const SECTION_ICONS: Record<string, string> = {
  'Key Concepts':                  '💡',
  'Main Arguments':                '📌',
  'Main Arguments / Explanations': '📌',
  'Important Definitions':         '📖',
  'Exam Tips':                     '🎯',
}

function parseMarkdown(content: string): { heading: string; lines: string[]; icon: string }[] {
  const sections: { heading: string; lines: string[]; icon: string }[] = []
  let current: { heading: string; lines: string[]; icon: string } | null = null

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      const heading = line.replace('## ', '').trim()
      current = { heading, icon: SECTION_ICONS[heading] || '📌', lines: [] }
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

  const [scope, setScope] = React.useState<SummaryScope>('module')
  const [topic, setTopic] = React.useState('')
  const { summary, summaries, generating, generate, openSummary, closeSummary } = useSummary(activeModuleId)
  const toast = useToast()

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (!summary) {
    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="AI Summary" subtitle="Understand your material" onBackPress={() => router.back()} />
        <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

          {!activeModuleId ? (
            <EmptyState
              emoji="📋"
              title="No module selected"
              subtitle="Open a module first, then generate a structured summary."
              action={{ label: 'Browse modules', onPress: () => router.push('/(tabs)/modules' as any) }}
            />
          ) : (
            <>
              {/* Module banner */}
              <StyledCard backgroundColor={C.sumBg} borderRadius={18} padding={16} marginBottom={24}
                style={{ borderWidth: 1, borderColor: `${C.sumColor}30` }}
              >
                <Stack horizontal alignItems="center" gap={12}>
                  <Stack
                    width={46} height={46} borderRadius={13}
                    backgroundColor={`${C.sumColor}20`} alignItems="center" justifyContent="center"
                  >
                    <Text style={{ fontSize: 22 }}>📋</Text>
                  </Stack>
                  <Stack flex={1}>
                    <Text variant="overline" color={C.sumColor}>Summarising</Text>
                    <Text variant="label" color={C.textPrimary} fontWeight="700" numberOfLines={1}>
                      {activeCourseCode} — {activeModuleTitle}
                    </Text>
                  </Stack>
                </Stack>
              </StyledCard>

              {/* Scope options */}
              <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>
                Summary scope
              </Text>
              <Stack gap={10} marginBottom={24}>
                {SCOPE_OPTIONS.map(({ key, label, emoji, desc }) => (
                  <StyledPressable
                    key={key}
                    backgroundColor={scope === key ? C.sumBg : C.bgCard}
                    borderRadius={16} padding={16}
                    borderWidth={scope === key ? 2 : 1}
                    borderColor={scope === key ? C.sumColor : C.border}
                    horizontal alignItems="center" gap={14}
                    onPress={() => setScope(key)}
                    style={scope === key ? {
                      shadowColor: C.sumColor, shadowOpacity: 0.12,
                      shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
                    } : undefined}
                  >
                    <Stack
                      width={46} height={46} borderRadius={13}
                      backgroundColor={scope === key ? `${C.sumColor}20` : C.bgMuted}
                      alignItems="center" justifyContent="center"
                    >
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </Stack>
                    <Stack flex={1} gap={3}>
                      <Text variant="label"
                        color={scope === key ? C.sumColor : C.textPrimary}
                        fontWeight={scope === key ? '700' : '500'}
                      >{label}</Text>
                      <Text variant="caption" color={C.textSecondary}>{desc}</Text>
                    </Stack>
                    {scope === key && (
                      <Stack
                        width={24} height={24} borderRadius={12}
                        backgroundColor={C.sumColor} alignItems="center" justifyContent="center"
                      >
                        <Text style={{ fontSize: 12, color: C.white, fontWeight: '700' }}>✓</Text>
                      </Stack>
                    )}
                  </StyledPressable>
                ))}
              </Stack>

              {/* Previous summaries */}
              {summaries.length > 0 && (
                <>
                  <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>
                    Previous summaries
                  </Text>
                  <Stack gap={8} marginBottom={24}>
                    {summaries.slice(0, 3).map((s: any) => (
                      <StyledPressable key={s.id} onPress={() => openSummary(s.id)}>
                        <StyledCard backgroundColor={C.bgCard} borderRadius={14} padding={14}
                          style={{ borderWidth: 1, borderColor: C.border }}
                        >
                          <Stack horizontal alignItems="center" gap={12}>
                            <Stack
                              width={40} height={40} borderRadius={11}
                              backgroundColor={C.sumBg} alignItems="center" justifyContent="center"
                            >
                              <Text style={{ fontSize: 18 }}>📋</Text>
                            </Stack>
                            <Stack flex={1} gap={3}>
                              <Text variant="label" color={C.textPrimary} fontWeight="600">
                                {s.scope.charAt(0).toUpperCase() + s.scope.slice(1)} summary
                              </Text>
                              <Text variant="caption" color={C.textSecondary}>
                                {s.source_doc_count} sources · {new Date(s.created_at).toLocaleDateString()}
                              </Text>
                            </Stack>
                            <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
                          </Stack>
                        </StyledCard>
                      </StyledPressable>
                    ))}
                  </Stack>
                </>
              )}

              {/* Topic */}
              <Stack gap={8} marginBottom={24}>
                <Text variant="label" color={C.textPrimary} fontWeight="700">
                  Topic (optional)
                </Text>
                <Stack
                  backgroundColor={C.bgInput} borderRadius={14}
                  borderWidth={1} borderColor={C.border}
                  paddingHorizontal={16} paddingVertical={12}
                >
                  <TextInput
                    value={topic}
                    onChangeText={setTopic}
                    placeholder="e.g. Python data types, React Native hooks, TypeScript generics"
                    placeholderTextColor={C.textMuted}
                    style={{
                      color:      C.textPrimary,
                      fontSize:   14,
                      fontFamily: 'PlusJakartaSans_400Regular',
                    }}
                  />
                </Stack>
                <Text variant="caption" color={C.textSecondary}>
                  Leave blank to cover all topics in this module
                </Text>
              </Stack>

              <StyledButton
                backgroundColor={C.sumColor} borderRadius={16} paddingVertical={17}
                loading={generating} onPress={() => generate(scope, topic || undefined)}
                style={{
                  shadowColor: C.sumColor, shadowOpacity: 0.4,
                  shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
                }}
              >
                <Text variant="button" color={C.white}>
                  {generating ? 'Generating summary…' : 'Generate AI summary'}
                </Text>
              </StyledButton>
            </>
          )}
        </StyledScrollView>
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
      <ScreenHeader
        title="AI Summary"
        subtitle={`${activeCourseCode || ''} · ${summary.scope}`}
        onBackPress={closeSummary}
        rightIcon={
          <Stack
            backgroundColor={C.sumBg} borderRadius={10}
            paddingHorizontal={10} paddingVertical={5}
          >
            <Text variant="caption" color={C.sumColor} fontWeight="700">
              {summary.source_doc_count} sources
            </Text>
          </Stack>
        }
      />

      <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

        {/* Header card */}
        <Stack
          backgroundColor={C.navy} borderRadius={22} padding={22} marginBottom={20}
          style={{
            overflow: 'hidden',
            shadowColor: '#0d0d1a', shadowOpacity: 0.25,
            shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
          }}
        >
          <Stack
            position="absolute" top={-80} right={-60} width={220} height={220}
            borderRadius={999} backgroundColor="rgba(245,158,11,0.08)" pointerEvents="none"
          />
          <Stack
            position="absolute" bottom={-60} left={-40} width={180} height={180}
            borderRadius={999} backgroundColor="rgba(91,127,255,0.06)" pointerEvents="none"
          />
          <Text variant="overline" color="rgba(255,255,255,0.45)" marginBottom={8}>
            AI Generated Summary
          </Text>
          <Text variant="title" color="#FFFFFF" fontWeight="800">
            {activeCourseCode} — {summary.scope.charAt(0).toUpperCase() + summary.scope.slice(1)} Overview
          </Text>
          <Stack horizontal gap={8} marginTop={16} flexWrap="wrap">
            <Stack
              backgroundColor="rgba(245,158,11,0.2)" borderRadius={8}
              paddingHorizontal={10} paddingVertical={5}
            >
              <Text variant="caption" color="#FCD34D" fontWeight="600">
                {summary.source_doc_count} documents
              </Text>
            </Stack>
            <Stack
              backgroundColor="rgba(91,127,255,0.2)" borderRadius={8}
              paddingHorizontal={10} paddingVertical={5}
            >
              <Text variant="caption" color="#A3BFFF" fontWeight="600">
                {sections.length} sections
              </Text>
            </Stack>
          </Stack>
        </Stack>

        {/* Sections */}
        <Stack gap={12}>
          {sections.map((section, idx) => (
            <StyledCard key={idx} backgroundColor={C.bgCard} borderRadius={20} padding={18}
              style={{ borderWidth: 1, borderColor: C.border }}
            >
              {/* Section header */}
              <Stack horizontal alignItems="center" gap={12} marginBottom={16}>
                <Stack
                  width={40} height={40} borderRadius={12}
                  backgroundColor={C.sumBg} alignItems="center" justifyContent="center"
                >
                  <Text style={{ fontSize: 18 }}>{section.icon}</Text>
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
                    <Stack key={i} horizontal gap={10} alignItems="flex-start">
                      {!isDefinition && (
                        <Stack
                          width={6} height={6} borderRadius={3}
                          backgroundColor={C.sumColor}
                          style={{ marginTop: 8, flexShrink: 0 }}
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
          ))}
        </Stack>

        {/* Regenerate */}
        <StyledButton
          backgroundColor={C.bgCard} borderRadius={16} paddingVertical={15} marginTop={20}
          borderWidth={1} borderColor={C.border}
          onPress={closeSummary}
        >
          <Text variant="button" color={C.textPrimary}>↺ New summary</Text>
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
    </StyledPage>
  )
}
