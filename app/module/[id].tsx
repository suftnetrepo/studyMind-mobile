import React from 'react'
import { Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton, TabBar, type TabItem,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { useColors, useIsDark, getModuleColors, TOOLS } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useModuleDetail } from '../../src/hooks'

type TabKey = 'overview' | 'documents' | 'chat'
const TABS: TabItem<TabKey>[] = [
  { value: 'overview',  label: 'Overview'  },
  { value: 'documents', label: 'Documents' },
  { value: 'chat',      label: 'Chat'      },
]

const FILE_EMOJI: Record<string, string> = {
  pdf: '📕', docx: '📄', txt: '📃', md: '📝', csv: '📊',
}

const TOOL_META = {
  chat:       { emoji: '💬', label: 'AI Tutor',   desc: 'Ask questions',    color: 'chatColor',  bg: 'chatBg'  },
  quiz:       { emoji: '📝', label: 'AI Quiz',    desc: 'Test yourself',    color: 'quizColor',  bg: 'quizBg'  },
  flashcards: { emoji: '🃏', label: 'Flashcards', desc: 'Memorise terms',   color: 'flashColor', bg: 'flashBg' },
  summary:    { emoji: '📋', label: 'AI Summary', desc: 'Get an overview',  color: 'sumColor',   bg: 'sumBg'   },
} as const

export default function ModuleDetailScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { activeModuleTitle, activeCourseCode, setActiveModule } = useModuleStore()
  const [tab, setTab] = React.useState<TabKey>('overview')

  const { module, documents, loading } = useModuleDetail(id || null)

  const mc       = getModuleColors(C, 0)
  const classDocs    = documents.filter((d) => d.visibility === 'class')
  const personalDocs = documents.filter((d) => d.visibility === 'personal')

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader
        title={activeCourseCode || module?.course_code || 'Module'}
        subtitle={activeModuleTitle || module?.title || undefined}
        onBackPress={() => router.back()}
      />

      <TabBar
        options={TABS} value={tab} onChange={setTab}
        indicator="line" showBorder tabAlign="scroll"
        style={{ marginTop: 8, marginHorizontal: 16 }}
        colors={{
          background:  C.bgCard,
          activeText:  C.primary,
          indicator:   C.primary,
          text:        C.textSecondary,
          border:      C.border,
        }}
      />

      <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Overview ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <Stack gap={18}>
            {/* Hero */}
            <Stack
              backgroundColor={C.navy} borderRadius={22} padding={22}
              style={{
                overflow: 'hidden',
                shadowColor: '#0d0d1a', shadowOpacity: 0.25,
                shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
              }}
            >
              <Stack
                position="absolute" top={-80} right={-60} width={220} height={220}
                borderRadius={999} backgroundColor={`${mc.color}12`} pointerEvents="none"
              />
              <Stack
                backgroundColor={`${mc.color}22`} borderRadius={10}
                paddingHorizontal={12} paddingVertical={5}
                style={{ alignSelf: 'flex-start' }} marginBottom={10}
              >
                <Text variant="overline" color={mc.color} style={{ fontSize: 10, letterSpacing: 0.4 }}>
                  {activeCourseCode || module?.course_code || 'MODULE'}
                </Text>
              </Stack>
              <Text variant="title" color="#FFFFFF" fontWeight="800" style={{ lineHeight: 28 }}>
                {activeModuleTitle || module?.title}
              </Text>

              {/* Stats row */}
              <Stack horizontal gap={10} marginTop={18}>
                {[
                  { value: classDocs.length,    label: 'Class docs' },
                  { value: personalDocs.length, label: 'My notes'   },
                  { value: documents.reduce((a, d) => a + (d.chunk_count || 0), 0), label: 'Chunks' },
                ].map((stat) => (
                  <Stack
                    key={stat.label} flex={1}
                    backgroundColor="rgba(255,255,255,0.1)"
                    borderRadius={12} padding={12} alignItems="center" gap={3}
                  >
                    <Text variant="title" color="#FFFFFF" fontWeight="800"
                      style={{ fontSize: 20 }}
                    >{stat.value}</Text>
                    <Text variant="caption" color="rgba(255,255,255,0.5)">{stat.label}</Text>
                  </Stack>
                ))}
              </Stack>
            </Stack>

            {/* AI tools grid */}
            <Stack>
              <Text variant="subtitle" color={C.textPrimary} fontWeight="700" marginBottom={14}>
                AI Tools
              </Text>
              <Stack style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {TOOLS.map((tool) => {
                  const meta = TOOL_META[tool.key as keyof typeof TOOL_META]
                  const color = C[meta.color as keyof typeof C] as string
                  const bg    = C[meta.bg as keyof typeof C] as string

                  return (
                    <StyledPressable
                      key={tool.key} style={{ width: '47%' }}
                      onPress={() => {
                        if (module) setActiveModule(module.id, module.title, module.course_code)
                        router.push(`/${tool.key}` as any)
                      }}
                    >
                      <StyledCard
                        backgroundColor={C.bgCard} borderRadius={18} padding={16}
                        style={{ borderWidth: 1, borderColor: C.border }}
                      >
                        <Stack
                          width={48} height={48} borderRadius={14}
                          backgroundColor={bg} alignItems="center" justifyContent="center"
                          marginBottom={12}
                        >
                          <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
                        </Stack>
                        <Text variant="label" color={C.textPrimary} fontWeight="700">
                          {meta.label}
                        </Text>
                        <Text variant="caption" color={C.textSecondary} marginTop={3}>
                          {meta.desc}
                        </Text>
                      </StyledCard>
                    </StyledPressable>
                  )
                })}
              </Stack>
            </Stack>
          </Stack>
        )}

        {/* ── Documents ────────────────────────────────────────────────── */}
        {tab === 'documents' && (
          <Stack gap={14}>
            <StyledButton
              backgroundColor={C.primary} borderRadius={14} paddingVertical={14}
              onPress={() => {}}
              style={{
                shadowColor: C.primary, shadowOpacity: 0.3,
                shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
              }}
            >
              <Text variant="button" color={C.white}>+ Upload material</Text>
            </StyledButton>

            {loading && (
              <Stack gap={10}>
                {[1, 2, 3].map((i) => (
                  <Stack key={i} height={72} backgroundColor={C.bgMuted} borderRadius={14}
                    style={{ opacity: 0.4 }}
                  />
                ))}
              </Stack>
            )}

            {/* Class materials */}
            {classDocs.length > 0 && (
              <Stack gap={6}>
                <Text variant="overline" color={C.textSecondary} marginBottom={4}>
                  Class materials
                </Text>
                {classDocs.map((doc) => (
                  <StyledCard key={doc.id} backgroundColor={C.bgCard} borderRadius={14} padding={14}
                    style={{ borderWidth: 1, borderColor: C.border }}
                  >
                    <Stack horizontal alignItems="center" gap={12}>
                      <Stack
                        width={42} height={42} borderRadius={12}
                        backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
                      >
                        <Text style={{ fontSize: 18 }}>
                          {FILE_EMOJI[doc.file_type] || '📄'}
                        </Text>
                      </Stack>
                      <Stack flex={1} gap={4}>
                        <Text variant="label" color={C.textPrimary} fontWeight="600"
                          numberOfLines={1}
                        >{doc.filename}</Text>
                        <Stack horizontal alignItems="center" gap={8}>
                          <Stack
                            backgroundColor={C.successBg} borderRadius={6}
                            paddingHorizontal={7} paddingVertical={2}
                          >
                            <Text variant="caption" color={C.success} fontWeight="700"
                              style={{ fontSize: 9 }}
                            >● indexed</Text>
                          </Stack>
                          <Text variant="caption" color={C.textMuted}>
                            {doc.chunk_count} chunks
                          </Text>
                        </Stack>
                      </Stack>
                    </Stack>
                  </StyledCard>
                ))}
              </Stack>
            )}

            {/* Personal notes */}
            {personalDocs.length > 0 && (
              <Stack gap={6}>
                <Text variant="overline" color={C.textSecondary} marginBottom={4} marginTop={8}>
                  My personal notes
                </Text>
                {personalDocs.map((doc) => (
                  <StyledCard key={doc.id} backgroundColor={C.bgCard} borderRadius={14} padding={14}
                    style={{ borderWidth: 1, borderColor: C.border }}
                  >
                    <Stack horizontal alignItems="center" gap={12}>
                      <Stack
                        width={42} height={42} borderRadius={12}
                        backgroundColor={C.flashBg} alignItems="center" justifyContent="center"
                      >
                        <Text style={{ fontSize: 18 }}>
                          {FILE_EMOJI[doc.file_type] || '📄'}
                        </Text>
                      </Stack>
                      <Stack flex={1} gap={4}>
                        <Text variant="label" color={C.textPrimary} fontWeight="600"
                          numberOfLines={1}
                        >{doc.filename}</Text>
                        <Stack horizontal alignItems="center" gap={8}>
                          <Stack
                            backgroundColor={C.flashBg} borderRadius={6}
                            paddingHorizontal={7} paddingVertical={2}
                          >
                            <Text variant="caption" color={C.flashColor} fontWeight="700"
                              style={{ fontSize: 9 }}
                            >🔒 private</Text>
                          </Stack>
                          <Text variant="caption" color={C.textMuted}>
                            {doc.chunk_count} chunks
                          </Text>
                        </Stack>
                      </Stack>
                    </Stack>
                  </StyledCard>
                ))}
              </Stack>
            )}

            {!loading && documents.length === 0 && (
              <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={28}
                alignItems="center" gap={10}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ fontSize: 36 }}>📂</Text>
                <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No documents yet</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center">
                  Upload lecture slides, notes, or handouts to get started.
                </Text>
              </StyledCard>
            )}
          </Stack>
        )}

        {/* ── Chat history ─────────────────────────────────────────────── */}
        {tab === 'chat' && (
          <Stack gap={10}>
            <StyledButton
              backgroundColor={C.primary} borderRadius={14} paddingVertical={14}
              onPress={() => {
                if (module) setActiveModule(module.id, module.title, module.course_code)
                router.push('/chat')
              }}
              style={{
                shadowColor: C.primary, shadowOpacity: 0.3,
                shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
              }}
            >
              <Text variant="button" color={C.white}>+ New conversation</Text>
            </StyledButton>

            {/* Recent session placeholders */}
            {['What are the key topics in this module?', 'Explain the main concepts from Week 3'].map((title, i) => (
              <StyledPressable key={i} onPress={() => {
                if (module) setActiveModule(module.id, module.title, module.course_code)
                router.push('/chat')
              }}>
                <StyledCard backgroundColor={C.bgCard} borderRadius={14} padding={14}
                  style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack horizontal alignItems="center" gap={12}>
                    <Stack
                      width={40} height={40} borderRadius={12}
                      backgroundColor={C.chatBg} alignItems="center" justifyContent="center"
                    >
                      <Text style={{ fontSize: 18 }}>💬</Text>
                    </Stack>
                    <Stack flex={1} gap={4}>
                      <Text variant="label" color={C.textPrimary} fontWeight="600"
                        numberOfLines={1}
                      >{title}</Text>
                      <Text variant="caption" color={C.textSecondary}>Today · 3 messages</Text>
                    </Stack>
                    <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
                  </Stack>
                </StyledCard>
              </StyledPressable>
            ))}
          </Stack>
        )}
      </StyledScrollView>
    </StyledPage>
  )
}
