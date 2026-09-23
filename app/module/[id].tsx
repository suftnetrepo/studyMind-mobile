import React from 'react'
import { Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton, TabBar, type TabItem, useToast, useLoader, useActionSheet, useDialogue,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { quotaGate, incrementQuota } from '../../src/utils/quota'
import { useColors, useIsDark, TOOLS } from '../../src/constants'
import { useModuleStore, useAuthStore } from '../../src/stores'
import { useModuleDetail } from '../../src/hooks'
import { chatService, moduleService } from '../../src/services/api'
import { ToolArt, LaptopArt, type ToolArtKind } from '../../src/components/ToolArt'
import { LoadingButton } from '../../src/components/LoadingButton'

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
  chat:       { icon: 'message-circle', label: 'Tutor',      desc: 'Ask questions and get instant help', color: 'chatColor',  bg: 'chatBg'  },
  quiz:       { icon: 'help-circle',    label: 'Quiz',       desc: 'Test yourself and track your progress', color: 'quizColor',  bg: 'quizBg'  },
  flashcards: { icon: 'credit-card',    label: 'Flashcards', desc: 'Memorise key terms with spaced repetition', color: 'flashColor', bg: 'flashBg' },
  summary:    { icon: 'clipboard',      label: 'Summary',    desc: 'Get a clear overview of any topic', color: 'sumColor',   bg: 'sumBg'   },
} as const satisfies Record<string, { icon: keyof typeof Feather.glyphMap; label: string; desc: string; color: string; bg: string }>

// An unsynced pick — shown so the student can confirm it's the right file
// (or discard it) before it's actually uploaded and indexed for the AI.
function PendingDocCard({
  name, tone, syncing, onSync, onDiscard, C,
}: {
  name: string
  tone: 'primary' | 'flash'
  syncing: boolean
  onSync: () => void
  onDiscard: () => void
  C: ReturnType<typeof useColors>
}) {
  const iconBg    = tone === 'primary' ? C.primaryBg : C.flashBg
  const iconColor = tone === 'primary' ? C.primary : C.flashColor
  return (
    <StyledCard backgroundColor={C.bgCard} borderRadius={14} padding={14}
      style={{ borderWidth: 1, borderColor: C.warning }}
    >
      <Stack horizontal alignItems="center" gap={12}>
        <Stack width={42} height={42} borderRadius={12}
          backgroundColor={iconBg} alignItems="center" justifyContent="center"
        >
          <Feather name={FILE_ICON[name.split('.').pop() || ''] || 'file'} size={18} color={iconColor} />
        </Stack>
        <Stack flex={1} gap={4}>
          <Text variant="label" color={C.textPrimary} fontWeight="600" numberOfLines={1}>{name}</Text>
          <Stack backgroundColor={C.warningBg} borderRadius={6} paddingHorizontal={7} paddingVertical={2}
            alignSelf="flex-start"
          >
            <Text variant="caption" color={C.warning} fontWeight="700" style={{ fontSize: 9 }}>
              ● not synced
            </Text>
          </Stack>
        </Stack>
        {!syncing && (
          <StyledPressable
            onPress={onDiscard}
            width={32} height={32} borderRadius={10}
            alignItems="center" justifyContent="center"
          >
            <Feather name="trash-2" size={16} color={C.textMuted} />
          </StyledPressable>
        )}
        <LoadingButton
          backgroundColor={C.warning} borderRadius={10}
          paddingHorizontal={14} paddingVertical={9}
          loading={syncing} onPress={onSync} label="Sync now"
          textVariant="caption" fontWeight="700"
        />
      </Stack>
      <Text variant="caption" color={C.textSecondary} style={{ fontSize: 11, marginTop: 8 }}>
        The AI Tutor can't see this yet. Tap Sync now to add it to what it knows for this module.
      </Text>
    </StyledCard>
  )
}

export default function ModuleDetailScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { activeModuleTitle, activeCourseCode, setActiveModule } = useModuleStore()
  const user = useAuthStore((s) => s.user)
  const isLecturer = user?.role === 'lecturer' || user?.role === 'admin'
  const [tab, setTab] = React.useState<TabKey>('overview')

  const {
    module, documents, sessions, loading, uploadDocument, deleteDocument, deleteSession, refetch,
  } = useModuleDetail(id || null)
  const toast = useToast()
  const loader = useLoader()
  const actionSheet = useActionSheet()
  const dialogue = useDialogue()

  // The screen stays mounted (just unfocused) while chatting/syncing elsewhere in
  // the stack, so its mount-time fetch alone never picks up a session created — or
  // a document synced — after that point. Refetch whenever this screen regains focus.
  const focused = useIsFocused()
  const skipFirstFocus = React.useRef(true)
  React.useEffect(() => {
    if (!focused) return
    if (skipFirstFocus.current) { skipFirstFocus.current = false; return }
    refetch()
  }, [focused]) // eslint-disable-line react-hooks/exhaustive-deps

  const classDocs = documents.filter((d) => d.visibility === 'class')
  const myNotes   = documents.filter((d) => d.visibility === 'personal')

  // A picked file or scanned page lands here first, unsynced — the AI only
  // learns from it once the student confirms it's the right one and taps
  // Sync. Uploading/indexing immediately, before the student can review it,
  // is what let a wrong or half-picked file reach the AI with no way back —
  // and scanning used to skip this list entirely and jump to Notes instead,
  // which is the inconsistent "different screen" flow this replaces.
  type PendingDoc =
    | { id: string; name: string; visibility: 'class' | 'personal'; source: 'file'; uri: string; type: string }
    | { id: string; name: string; visibility: 'class' | 'personal'; source: 'text'; content: string }
  const [pendingDocs, setPendingDocs] = React.useState<PendingDoc[]>([])
  const [syncingId,   setSyncingId]   = React.useState<string | null>(null)
  const pendingClassDocs = pendingDocs.filter((d) => d.visibility === 'class')
  const pendingMyDocs    = pendingDocs.filter((d) => d.visibility === 'personal')

  const handleUpload = async (visibility: 'class' | 'personal') => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown'],
      copyToCacheDirectory: true,
    })
    if (result.canceled) return
    const file = result.assets[0]
    const pending: PendingDoc = { id: `pending-${Date.now()}`, name: file.name, visibility, source: 'file', uri: file.uri, type: file.mimeType || 'application/pdf' }
    setPendingDocs((prev) => [pending, ...prev])
    syncPendingDoc(pending)
  }

  const syncPendingDoc = async (pending: PendingDoc) => {
    const ok = await dialogue.confirm({
      title:        'Sync this document?',
      message:      `You haven't synced "${pending.name}" yet — the AI Tutor can't see it until you do. Sync it now so it can use it to answer your questions?`,
      icon:         '🔄',
      confirmLabel: 'Sync now',
      cancelLabel:  'Not yet',
    })
    if (!ok) return
    setSyncingId(pending.id)
    const success = pending.source === 'file'
      ? await uploadDocument({ uri: pending.uri, name: pending.name, type: pending.type }, pending.visibility)
      : await moduleService.pasteText(id!, pending.name, pending.content, pending.visibility)
        .then(() => refetch().then(() => true))
        .catch((e: any) => { toast.error('Sync failed', e.message); return false })
    setSyncingId(null)
    if (success) {
      setPendingDocs((prev) => prev.filter((p) => p.id !== pending.id))
      toast.success(
        pending.visibility === 'personal' ? 'Synced!' : 'Synced to class!',
        pending.visibility === 'personal'
          ? 'Indexed and ready to use in the AI Tutor.'
          : 'Indexed and now available to the class.',
      )
    }
  }

  const discardPendingDoc = (id: string) => setPendingDocs((prev) => prev.filter((p) => p.id !== id))

  const processScan = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) return
    if (!(await quotaGate('scan_image'))) return
    const loadId = loader.show({ label: 'Reading page…', variant: 'dots' })
    try {
      const { text } = await chatService.extractFromImage(asset.base64, asset.mimeType || 'image/jpeg')
      await incrementQuota('scan_image')
      if (!text?.trim()) {
        toast.warning('No text found', 'Try again with the page in clear view.')
        return
      }
      const pending: PendingDoc = { id: `pending-${Date.now()}`, name: `Scanned page ${new Date().toLocaleDateString()}`, visibility: 'personal', source: 'text', content: text }
      setPendingDocs((prev) => [pending, ...prev])
      setTab('documents')
      syncPendingDoc(pending)
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
      title: 'Scan a page',
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
        style={{ marginHorizontal: 16, marginTop:16 }}
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
              <Text paddingHorizontal={16} variant="body" color={C.textMuted}  marginBottom={14}>
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
                        // Tutor opens this module's Chat tab, where you can continue a chat or start a new one.
                        if (tool.key === 'chat') { setTab('chat'); return }
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

            {pendingClassDocs.length > 0 && (
              <Stack gap={10}>
                {pendingClassDocs.map((doc) => (
                  <PendingDocCard
                    key={doc.id} name={doc.name} tone="primary" C={C}
                    syncing={syncingId === doc.id}
                    onSync={() => syncPendingDoc(doc)}
                    onDiscard={() => discardPendingDoc(doc.id)}
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

            {!loading && classDocs.length === 0 && pendingClassDocs.length === 0 && (
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
            {loading && (
              <Stack gap={10}>
                {[1, 2, 3].map((i) => (
                  <Stack key={i} height={72} backgroundColor={C.bgMuted} borderRadius={14}
                    style={{ opacity: 0.4 }}
                  />
                ))}
              </Stack>
            )}

            {pendingMyDocs.length > 0 && (
              <Stack gap={10}>
                {pendingMyDocs.map((doc) => (
                  <PendingDocCard
                    key={doc.id} name={doc.name} tone="flash" C={C}
                    syncing={syncingId === doc.id}
                    onSync={() => syncPendingDoc(doc)}
                    onDiscard={() => discardPendingDoc(doc.id)}
                  />
                ))}
              </Stack>
            )}

            {myNotes.length > 0 && (
              <Stack gap={10}>
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

            {!loading && myNotes.length === 0 && pendingMyDocs.length === 0 && (
              <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={28}
                alignItems="center" gap={10}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Feather name="folder" size={36} color={C.textMuted} />
                <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No documents yet</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center">
                  Tap the + button to scan a page or upload a file and start studying.
                </Text>
              </StyledCard>
            )}
          </Stack>
        )}

        {/* ── Chat history ─────────────────────────────────────────────── */}
        {tab === 'chat' && (
          <Stack gap={10}>
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
                      <StyledPressable
                        onPress={() => deleteSession(session.id, session.title)}
                        width={32} height={32} borderRadius={10} hitSlop={8}
                        alignItems="center" justifyContent="center"
                      >
                        <Feather name="trash-2" size={16} color={C.textMuted} />
                      </StyledPressable>
                    </Stack>
                  </StyledCard>
                </StyledPressable>
              ))
            )}
          </Stack>
        )}
      </StyledScrollView>


      {/* Add to this module: scan a page or upload a file */}
      {tab === 'documents' && !isLecturer && (
        <StyledPressable
          onPress={() =>
            actionSheet.show({
              title: 'Add to this module',
              items: [
                { icon: '📷', label: 'Scan a page',   onPress: handleScan },
                { icon: '📄', label: 'Upload a file', onPress: () => handleUpload('personal') },
              ],
            })
          }
          width={58} height={58} borderRadius={29}
          backgroundColor={C.flashColor} alignItems="center" justifyContent="center"
          style={{
            position: 'absolute', right: 20, bottom: Platform.OS === 'ios' ? 34 : 22,
            shadowColor: C.flashColor, shadowOpacity: 0.4, shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 }, elevation: 8,
          }}
        >
          <Feather name="plus" size={26} color={C.white} />
        </StyledPressable>
      )}

      {/* New conversation */}
      {tab === 'chat' && (
        <StyledPressable
          onPress={() => {
            if (module) setActiveModule(module.id, module.title, module.course_code)
            router.push('/chat')
          }}
          width={58} height={58} borderRadius={29}
          backgroundColor={C.chatColor} alignItems="center" justifyContent="center"
          style={{
            position: 'absolute', right: 20, bottom: Platform.OS === 'ios' ? 34 : 22,
            shadowColor: C.chatColor, shadowOpacity: 0.4, shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 }, elevation: 8,
          }}
        >
          <Feather name="plus" size={26} color={C.white} />
        </StyledPressable>
      )}
    </StyledPage>
  )
}
