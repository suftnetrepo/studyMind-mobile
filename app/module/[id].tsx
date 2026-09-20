import React from 'react'
import { Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton, TabBar, type TabItem, useToast, useLoader, useActionSheet,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { useColors, useIsDark, TOOLS } from '../../src/constants'
import { useModuleStore, useAuthStore } from '../../src/stores'
import { useModuleDetail } from '../../src/hooks'
import { chatService } from '../../src/services/api'
import { useNotes } from '../../src/hooks/useNotes'
import { ToolArt, LaptopArt, type ToolArtKind } from '../../src/components/ToolArt'

type TabKey = 'overview' | 'documents' | 'chat'
const TABS: TabItem<TabKey>[] = [
  { value: 'overview',  label: 'Overview',  iconRender: (color) => <Feather name="grid" size={16} color={color as string} /> },
  { value: 'documents', label: 'Documents', iconRender: (color) => <Feather name="file-text" size={16} color={color as string} /> },
  { value: 'chat',      label: 'Chat',      iconRender: (color) => <Feather name="message-circle" size={16} color={color as string} /> },
]

const FILE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  pdf: 'file-text', docx: 'file-text', txt: 'file', md: 'file-text', csv: 'bar-chart-2',
}

const TOOL_META = {
  chat:       { icon: 'message-circle', label: 'AI Tutor',   desc: 'Ask questions and get instant help', color: 'chatColor',  bg: 'chatBg'  },
  quiz:       { icon: 'help-circle',    label: 'AI Quiz',    desc: 'Test yourself and track your progress', color: 'quizColor',  bg: 'quizBg'  },
  flashcards: { icon: 'credit-card',    label: 'Flashcards', desc: 'Memorise key terms with spaced repetition', color: 'flashColor', bg: 'flashBg' },
  summary:    { icon: 'clipboard',      label: 'AI Summary', desc: 'Get a clear overview of any topic', color: 'sumColor',   bg: 'sumBg'   },
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
  const { notes, createNote, updateNote } = useNotes(id || null)
  const toast = useToast()
  const loader = useLoader()
  const actionSheet = useActionSheet()

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

  const processScan = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) return
    const loadId = loader.show({ label: 'Reading page…', variant: 'dots' })
    try {
      const { text } = await chatService.extractFromImage(asset.base64, asset.mimeType || 'image/jpeg')
      if (!text?.trim()) {
        toast.warning('No text found', 'Try again with the page in clear view.')
        return
      }
      const note = createNote(activeCourseCode || module?.course_code, 'Scanned note')
      updateNote(note.id, text)
      toast.success('Scanned!', 'Saved as a note. Review it before syncing to AI.')
      router.push(`/notes/${note.id}` as any)
    } catch (e: any) {
      toast.error('Could not read image', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const scanFrom = async (source: 'camera' | 'gallery') => {
    try {
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true }
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (perm.status !== 'granted') {
        toast.warning(
          source === 'camera' ? 'Camera access needed' : 'Gallery access needed',
          'Allow access in Settings.',
        )
        return
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)
      if (result.canceled || !result.assets[0]) return
      await processScan(result.assets[0])
    } catch (e: any) {
      toast.error(
        source === 'camera' ? 'Camera unavailable' : 'Could not open gallery',
        source === 'camera' ? 'Use "Choose from gallery" on a simulator.' : e.message,
      )
    }
  }

  const handleScan = () => {
    actionSheet.show({
      title: 'Scan notes',
      items: [
        { icon: '📷', label: 'Take a photo',        onPress: () => scanFrom('camera')  },
        { icon: '🖼️', label: 'Choose from gallery', onPress: () => scanFrom('gallery') },
      ],
    })
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
        indicator="line" showBorder tabAlign="center"
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
              backgroundColor={C.primaryBg} borderRadius={24} padding={16}
              style={{ overflow: 'hidden', borderWidth: 1, borderColor: `${C.primary}22` }}
            >
              <Stack
                style={{ position: 'absolute', right: -30, top: -30 }}
                width={170} height={170} borderRadius={85}
                backgroundColor={`${C.primary}12`} pointerEvents="none"
              />
              <Stack
                style={{ position: 'absolute', right: 60, top: 50 }}
                width={90} height={90} borderRadius={45}
                backgroundColor={`${C.primary}0D`} pointerEvents="none"
              />

              <Stack horizontal alignItems="flex-start" gap={6} paddingBottom={16}>
                <Stack flex={1} gap={10}>
                  <Stack
                    backgroundColor={C.primary} borderRadius={12}
                    paddingHorizontal={14} paddingVertical={6}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <Text variant="label" color={C.white} fontWeight="700">
                      {activeCourseCode || module?.course_code || 'MODULE'}
                    </Text>
                  </Stack>
                  <Text variant="title" color={C.textPrimary} fontWeight="800"
                    style={{ fontSize: 22, lineHeight: 28 }}
                  >
                    {activeModuleTitle || module?.title}
                  </Text>
                  {!!module?.description && (
                    <Text variant="caption" color={C.textSecondary}
                      numberOfLines={3} style={{ lineHeight: 18 }}
                    >
                      {module.description}
                    </Text>
                  )}
                </Stack>
                <Stack style={{ marginTop: 28 }} pointerEvents="none">
                  <LaptopArt accent={C.primary} width={118} height={88} />
                </Stack>
              </Stack>

              {/* Stats card */}
              <Stack
                horizontal backgroundColor={C.bgCard} borderRadius={18}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                {[
                  { value: classDocs.length, label: 'Class docs', icon: 'book-open' as const,      color: C.chatColor,  bg: C.chatBg  },
                  { value: myNotes.length,   label: 'My notes',   icon: 'edit-3' as const,         color: C.flashColor, bg: C.flashBg },
                  { value: sessions.length,  label: 'AI chats',   icon: 'message-circle' as const, color: C.quizColor,  bg: C.quizBg  },
                ].map((stat, i) => (
                  <Stack
                    key={stat.label} flex={1} alignItems="center" gap={6} paddingVertical={14}
                    style={i > 0 ? { borderLeftWidth: 1, borderLeftColor: C.border } : undefined}
                  >
                    <Stack
                      width={42} height={42} borderRadius={13}
                      backgroundColor={stat.bg} alignItems="center" justifyContent="center"
                    >
                      <Feather name={stat.icon} size={19} color={stat.color} />
                    </Stack>
                    <Text variant="title" color={C.textPrimary} fontWeight="800"
                      style={{ fontSize: 20, lineHeight: 24 }}
                    >{stat.value}</Text>
                    <Text variant="caption" color={C.textSecondary}>{stat.label}</Text>
                  </Stack>
                ))}
              </Stack>
            </Stack>

            {/* AI tools grid */}
            <Stack>
              <Text variant="subtitle" color={C.textPrimary} fontWeight="800" marginBottom={14}>
                AI Tools
              </Text>
              <Stack style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {TOOLS.map((tool) => {
                  const meta = TOOL_META[tool.key as keyof typeof TOOL_META]
                  const color = C[meta.color as keyof typeof C] as string
                  const bg    = C[meta.bg as keyof typeof C] as string

                  return (
                    <StyledPressable
                      key={tool.key} style={{ width: '47.6%' }}
                      onPress={() => {
                        if (module) setActiveModule(module.id, module.title, module.course_code)
                        router.push(`/${tool.key}` as any)
                      }}
                    >
                      <Stack
                        backgroundColor={bg} borderRadius={22} padding={14}
                        style={{ overflow: 'hidden', borderWidth: 1, borderColor: `${color}22`, minHeight: 148 }}
                      >
                        <Stack
                          pointerEvents="none"
                          style={{ position: 'absolute', right: 0, bottom: 0 }}
                        >
                          <ToolArt kind={tool.key as ToolArtKind} color={color} id={`tool-art-${tool.key}`} />
                        </Stack>

                        <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={12}>
                          <Stack
                            width={46} height={46} borderRadius={14}
                            backgroundColor={`${color}26`} alignItems="center" justifyContent="center"
                          >
                            <Feather name={meta.icon} size={21} color={color} />
                          </Stack>
                          <Stack
                            width={28} height={28} borderRadius={14}
                            backgroundColor={`${color}1F`} alignItems="center" justifyContent="center"
                          >
                            <Feather name="chevron-right" size={15} color={color} />
                          </Stack>
                        </Stack>
                        <Text variant="label" color={C.textPrimary} fontWeight="800" style={{ fontSize: 16 }}>
                          {meta.label}
                        </Text>
                        <Text variant="caption" color={C.textSecondary} marginTop={3}
                          style={{ lineHeight: 16, maxWidth: '82%' }}
                        >
                          {meta.desc}
                        </Text>
                      </Stack>
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
