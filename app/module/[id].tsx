import React from 'react'
import { Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton, TabBar, type TabItem, useToast,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { useColors, useIsDark, getModuleColors, TOOLS } from '../../src/constants'
import { useModuleStore, useAuthStore } from '../../src/stores'
import { useModuleDetail } from '../../src/hooks'
import { useNotes } from '../../src/hooks/useNotes'

type TabKey = 'overview' | 'documents' | 'chat'
const TABS: TabItem<TabKey>[] = [
  { value: 'overview',  label: 'Overview'  },
  { value: 'documents', label: 'Documents' },
  { value: 'chat',      label: 'Chat'      },
]

const FILE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  pdf: 'file-text', docx: 'file-text', txt: 'file', md: 'file-text', csv: 'bar-chart-2',
}

const TOOL_META = {
  chat:       { icon: 'message-circle', label: 'AI Tutor',   desc: 'Ask questions',    color: 'chatColor',  bg: 'chatBg'  },
  quiz:       { icon: 'help-circle',    label: 'AI Quiz',    desc: 'Test yourself',    color: 'quizColor',  bg: 'quizBg'  },
  flashcards: { icon: 'credit-card',    label: 'Flashcards', desc: 'Memorise terms',   color: 'flashColor', bg: 'flashBg' },
  summary:    { icon: 'clipboard',      label: 'AI Summary', desc: 'Get an overview',  color: 'sumColor',   bg: 'sumBg'   },
} as const satisfies Record<string, { icon: keyof typeof Feather.glyphMap; label: string; desc: string; color: string; bg: string }>

export default function ModuleDetailScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { activeModuleTitle, activeCourseCode, setActiveModule } = useModuleStore()
  const user = useAuthStore((s) => s.user)
  const isLecturer = user?.role === 'lecturer' || user?.role === 'admin'
  const [tab, setTab] = React.useState<TabKey>('overview')

  const {
    module, documents, sessions, loading, uploadDocument, deleteDocument,
  } = useModuleDetail(id || null)
  const { notes } = useNotes(id || null)
  const toast = useToast()

  const mc       = getModuleColors(C, 0)
  const classDocs = documents.filter((d) => d.visibility === 'class')
  const myNotes   = documents.filter((d) => d.visibility === 'personal')

  const handleUpload = async (visibility: 'class' | 'personal') => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown'],
      copyToCacheDirectory: true,
    })
    if (result.canceled) return
    const file = result.assets[0]
    const success = await uploadDocument(
      { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' },
      visibility,
    )
    if (success) {
      toast.success(
        visibility === 'personal' ? 'Notes uploaded!' : 'Material uploaded!',
        visibility === 'personal'
          ? 'Your notes have been indexed and are ready to use.'
          : 'The document has been indexed and is now available to the class.',
      )
    }
  }

  const handleScan = () => {
    toast.info('Coming soon', 'Camera scanning coming soon')
  }

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
                  { value: classDocs.length, label: 'Class docs', icon: 'book-open' as const },
                  { value: myNotes.length,   label: 'My notes',   icon: 'edit-3' as const },
                  { value: sessions.length,  label: 'AI chats',   icon: 'message-circle' as const },
                ].map((stat) => (
                  <Stack
                    key={stat.label} flex={1}
                    backgroundColor="rgba(255,255,255,0.08)"
                    borderRadius={14} padding={14} alignItems="center" gap={7}
                    style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <Feather name={stat.icon} size={15} color="rgba(255,255,255,0.55)" />
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
                          <Feather name={meta.icon} size={22} color={color} />
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
        {tab === 'documents' && isLecturer && (
          <Stack gap={14}>
            <StyledButton
              backgroundColor={C.primary} borderRadius={14} paddingVertical={14}
              onPress={() => handleUpload('class')}
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

            {classDocs.length > 0 && (
              <Stack gap={10}>
                {classDocs.map((doc) => (
                  <StyledCard key={doc.id} backgroundColor={C.bgCard} borderRadius={14} padding={14}
                    style={{ borderWidth: 1, borderColor: C.border }}
                  >
                    <Stack horizontal alignItems="center" gap={12}>
                      <Stack
                        width={42} height={42} borderRadius={12}
                        backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
                      >
                        <Feather name={FILE_ICON[doc.file_type] || 'file'} size={18} color={C.primary} />
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
                          {doc.version > 1 && (
                            <Stack
                              backgroundColor={C.bgMuted} borderRadius={6}
                              paddingHorizontal={7} paddingVertical={2}
                            >
                              <Text variant="caption" color={C.textSecondary} fontWeight="700"
                                style={{ fontSize: 9 }}
                              >v{doc.version}</Text>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                      <StyledPressable
                        onPress={() => deleteDocument(doc.id, doc.filename)}
                        width={32} height={32} borderRadius={10}
                        alignItems="center" justifyContent="center"
                      >
                        <Feather name="trash-2" size={16} color={C.textMuted} />
                      </StyledPressable>
                    </Stack>
                  </StyledCard>
                ))}
              </Stack>
            )}

            {!loading && classDocs.length === 0 && (
              <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={28}
                alignItems="center" gap={10}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Feather name="folder" size={36} color={C.textMuted} />
                <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No materials yet</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center">
                  Upload lecture slides, notes, or handouts to get started.
                </Text>
              </StyledCard>
            )}
          </Stack>
        )}

        {tab === 'documents' && !isLecturer && (
          <Stack gap={14}>
            <Text variant="overline" color={C.textSecondary}>My study notes</Text>

            <Stack horizontal gap={10}>
              <StyledButton
                flex={1}
                backgroundColor={C.flashColor} borderRadius={14} paddingVertical={14}
                onPress={() => handleUpload('personal')}
                style={{
                  shadowColor: C.flashColor, shadowOpacity: 0.3,
                  shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
                }}
              >
                <Stack horizontal alignItems="center" justifyContent="center" gap={7}>
                  <Feather name="upload" size={15} color={C.white} />
                  <Text variant="button" color={C.white}>Upload notes</Text>
                </Stack>
              </StyledButton>
              <StyledPressable
                onPress={handleScan}
                backgroundColor={C.bgCard} borderRadius={14} paddingVertical={14}
                alignItems="center" justifyContent="center"
                style={{ width: 60, borderWidth: 1, borderColor: C.border }}
              >
                <Feather name="camera" size={18} color={C.textPrimary} />
              </StyledPressable>
            </Stack>

            <StyledPressable onPress={() => router.push('/notes')}>
              <StyledCard backgroundColor={C.bgCard} borderRadius={16} padding={14}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Stack horizontal alignItems="center" gap={12}>
                  <Stack width={42} height={42} borderRadius={12}
                    backgroundColor={C.flashBg} alignItems="center" justifyContent="center"
                  >
                    <Feather name="edit-3" size={19} color={C.flashColor} />
                  </Stack>
                  <Stack flex={1}>
                    <Text variant="label" color={C.textPrimary} fontWeight="700">Written notes</Text>
                    <Text variant="caption" color={C.textSecondary}>
                      {notes.length} note{notes.length !== 1 ? 's' : ''} · tap to write or view
                    </Text>
                  </Stack>
                  <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
                </Stack>
              </StyledCard>
            </StyledPressable>

            {loading && (
              <Stack gap={10}>
                {[1, 2, 3].map((i) => (
                  <Stack key={i} height={72} backgroundColor={C.bgMuted} borderRadius={14}
                    style={{ opacity: 0.4 }}
                  />
                ))}
              </Stack>
            )}

            {myNotes.length > 0 && (
              <Stack gap={10}>
                <Text variant="overline" color={C.textSecondary}>Uploaded files</Text>
                {myNotes.map((doc) => (
                  <StyledCard key={doc.id} backgroundColor={C.bgCard} borderRadius={14} padding={14}
                    style={{ borderWidth: 1, borderColor: C.border }}
                  >
                    <Stack horizontal alignItems="center" gap={12}>
                      <Stack
                        width={42} height={42} borderRadius={12}
                        backgroundColor={C.flashBg} alignItems="center" justifyContent="center"
                      >
                        <Feather name={FILE_ICON[doc.file_type] || 'file'} size={18} color={C.flashColor} />
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
                      <StyledPressable
                        onPress={() => deleteDocument(doc.id, doc.filename)}
                        width={32} height={32} borderRadius={10}
                        alignItems="center" justifyContent="center"
                      >
                        <Feather name="trash-2" size={16} color={C.textMuted} />
                      </StyledPressable>
                    </Stack>
                  </StyledCard>
                ))}
              </Stack>
            )}

            {!loading && myNotes.length === 0 && (
              <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={28}
                alignItems="center" gap={10}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Feather name="folder" size={36} color={C.textMuted} />
                <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No uploaded files yet</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center">
                  Upload a document or use Written notes above to start studying.
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

            {/* Recent sessions */}
            {sessions.length === 0 ? (
              <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={28}
                alignItems="center" gap={10}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Feather name="message-circle" size={36} color={C.textMuted} />
                <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No conversations yet</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center">
                  Start a new conversation to ask about this module's materials.
                </Text>
              </StyledCard>
            ) : (
              sessions.map((session) => (
                <StyledPressable key={session.id} onPress={() => {
                  if (module) setActiveModule(module.id, module.title, module.course_code)
                  router.push(`/chat?sessionId=${session.id}`)
                }}>
                  <StyledCard backgroundColor={C.bgCard} borderRadius={14} padding={14}
                    style={{ borderWidth: 1, borderColor: C.border }}
                  >
                    <Stack horizontal alignItems="center" gap={12}>
                      <Stack
                        width={40} height={40} borderRadius={12}
                        backgroundColor={C.chatBg} alignItems="center" justifyContent="center"
                      >
                        <Feather name="message-circle" size={18} color={C.chatColor} />
                      </Stack>
                      <Stack flex={1} gap={4}>
                        <Text variant="label" color={C.textPrimary} fontWeight="600"
                          numberOfLines={1}
                        >{session.title || 'Conversation'}</Text>
                        <Text variant="caption" color={C.textSecondary}>
                          {session.message_count ?? 0} messages
                        </Text>
                      </Stack>
                      <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
                    </Stack>
                  </StyledCard>
                </StyledPressable>
              ))
            )}
          </Stack>
        )}
      </StyledScrollView>
    </StyledPage>
  )
}
