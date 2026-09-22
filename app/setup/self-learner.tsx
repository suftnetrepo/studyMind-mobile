import React, { useState } from 'react'
import { Platform, TextInput, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useIsFocused } from '@react-navigation/native'
import {
  StyledPage, StyledScrollView, Stack, StyledCard, StyledButton, StyledForm, StyledPressable,
  useToast, useLoader, useActionSheet,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { StepDots, HeroIcon } from '../../src/components/setup'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { moduleService, chatService } from '../../src/services/api'
import { useAuthStore, useModuleStore, setSetupDone } from '../../src/stores'
import { quotaGate, incrementQuota } from '../../src/utils/quota'

const EMOJIS = ['📖', '🐍', '📐', '💻', '🌍', '🔬', '🎨', '🏛️', '⚡', '🧠', '🎵', '📊']
const LEVELS = [
  { key: 'beginner',     label: 'Beginner',     desc: 'New to this topic'        },
  { key: 'intermediate', label: 'Intermediate', desc: 'Some prior knowledge'      },
  { key: 'advanced',     label: 'Advanced',     desc: 'Deep technical knowledge'  },
]
const FEATURES: { icon: keyof typeof Feather.glyphMap; label: string; desc: string; tone: 'chat' | 'quiz' | 'flash' | 'sum' }[] = [
  { icon: 'message-circle', label: 'AI Tutor',   desc: 'Ask questions about your material',  tone: 'chat'  },
  { icon: 'help-circle',    label: 'AI Quiz',    desc: 'Test yourself on any topic',          tone: 'quiz'  },
  { icon: 'credit-card',    label: 'Flashcards', desc: 'Memorise key terms and concepts',     tone: 'flash' },
  { icon: 'clipboard',      label: 'AI Summary', desc: 'Get a structured overview instantly', tone: 'sum'   },
]

type Step = 'name' | 'content' | 'generate' | 'ready'

export default function SelfLearnerSetup() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const actionSheet = useActionSheet()
  const user   = useAuthStore((s) => s.user)
  const { setActiveModule } = useModuleStore()

  const [step,      setStep]      = useState<Step>('name')
  const [title,     setTitle]     = useState('')
  const [emoji,     setEmoji]     = useState('📖')
  const [moduleId,  setModuleId]  = useState<string | null>(null)
  const [topic,     setTopic]     = useState('')
  const [level,     setLevel]     = useState('beginner')
  const [hasContent, setHasContent] = useState(false)

  const dotIndex = step === 'name' ? 0 : step === 'ready' ? 2 : 1
  const primaryShadow = {
    shadowColor: C.primary, shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  }

  const finish = async () => {
    if (user?.id) await setSetupDone(user.id)
    router.replace('/(tabs)')
  }

  const handleCreateCourse = async () => {
    if (!title.trim()) {
      toast.warning('Name your course', 'Give your study course a name.')
      return
    }
    const loadId = loader.show({ label: 'Creating your course…', variant: 'dots' })
    try {
      const code = title.trim().replace(/\s/g, '').slice(0, 4).toUpperCase()
      const res  = await moduleService.createModule(title.trim(), code, emoji, 'personal')
      setModuleId(res.id)
      setActiveModule(res.id, res.title, res.course_code)
      setStep('content')
    } catch (e: any) {
      toast.error('Could not create course', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const handleUploadFile = async () => {
    if (!moduleId) return
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown'],
      copyToCacheDirectory: true,
    })
    if (result.canceled) return
    const loadId = loader.show({ label: 'Uploading…', variant: 'dots' })
    try {
      const file = result.assets[0]
      await moduleService.uploadDocument(
        moduleId, { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' }, 'personal',
      )
      toast.success('Uploaded!', 'Your material is indexed.')
      setHasContent(true)
      setStep('ready')
    } catch (e: any) {
      toast.error('Upload failed', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  // Returning from the paste-text screen: see whether the course now has content.
  const isFocused = useIsFocused()
  React.useEffect(() => {
    if (!isFocused || !moduleId || step !== 'content') return
    moduleService.documents(moduleId).then((docs) => { if (docs.length > 0) setHasContent(true) }).catch(() => {})
  }, [isFocused, moduleId, step])

  const scanFrom = async (source: 'camera' | 'gallery') => {
    if (!moduleId) return
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (perm.status !== 'granted') {
        toast.warning('Access needed', 'Allow access in Settings.')
        return
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true }
      const res = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)
      if (res.canceled || !res.assets[0]?.base64) return
      if (!(await quotaGate('scan_image'))) return

      const asset  = res.assets[0]
      const loadId = loader.show({ label: 'Reading document…', variant: 'dots' })
      try {
        const { text } = await chatService.extractFromImage(asset.base64!, asset.mimeType || 'image/jpeg')
        await incrementQuota('scan_image')
        if (text.trim().length < 10) {
          toast.warning('No text found', 'Try again with the page in clear view.')
          return
        }
        await moduleService.pasteText(moduleId, `Scanned document ${new Date().toLocaleDateString()}`, text, 'personal')
        setHasContent(true)
        toast.success('Document scanned!', 'Saved and indexed. Scan another page or continue.')
      } finally {
        loader.hide(loadId)
      }
    } catch (e: any) {
      toast.error('Could not scan document', e.message)
    }
  }

  const handleScan = () =>
    actionSheet.show({
      title: 'Scan a document',
      items: [
        { icon: '📷', label: 'Take a photo',        onPress: () => scanFrom('camera')  },
        { icon: '🖼️', label: 'Choose from gallery', onPress: () => scanFrom('gallery') },
      ],
    })

  const handleGenerate = async () => {
    if (!moduleId || !topic.trim()) {
      toast.warning('Enter a topic', 'Tell us what to generate study material about.')
      return
    }
    if (!(await quotaGate('generate_material'))) return
    const loadId = loader.show({ label: 'Generating study material…', variant: 'dots' })
    try {
      await moduleService.generateMaterial(moduleId, topic.trim(), level, 'personal')
      await incrementQuota('generate_material')
      setHasContent(true)
      toast.success('Study material ready!', 'AI has created your study guide.')
      setStep('ready')
    } catch (e: any) {
      toast.error('Generation failed', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const OptionCard = ({ icon, title: t, desc, onPress, dark, dashed, tone }: {
    icon: keyof typeof Feather.glyphMap; title: string; desc: string; onPress: () => void
    dark?: boolean; dashed?: boolean; tone?: 'chat' | 'quiz' | 'flash'
  }) => (
    <StyledPressable style={{ width: '48%' }} onPress={onPress}>
      <Stack
        backgroundColor={dark ? C.navy : dashed ? C.bgMuted : C.bgCard}
        borderRadius={18} padding={18} alignItems="center" gap={10}
        style={{
          height: 150, overflow: 'hidden', justifyContent: 'center',
          borderWidth: dark ? 0 : 1.5, borderColor: C.border, borderStyle: dashed ? 'dashed' : 'solid',
        }}
      >
        <Stack
          width={50} height={50} borderRadius={15} alignItems="center" justifyContent="center"
          backgroundColor={dark ? 'rgba(91,127,255,0.3)' : dashed ? C.bgCard : tone ? { chat: C.chatBg, quiz: C.quizBg, flash: C.flashBg }[tone] : C.primaryBg}
        >
          <Feather name={icon} size={22} color={dark ? '#FFFFFF' : dashed ? C.textSecondary : tone ? { chat: C.chatColor, quiz: C.quizColor, flash: C.flashColor }[tone] : C.primary} />
        </Stack>
        <Stack alignItems="center" gap={3}>
          <Text variant="label" color={dark ? '#FFFFFF' : dashed ? C.textSecondary : C.textPrimary}
            fontWeight="700" textAlign="center"
          >{t}</Text>
          <Text variant="caption" color={dark ? 'rgba(255,255,255,0.6)' : C.textMuted} textAlign="center" numberOfLines={2}>{desc}</Text>
        </Stack>
      </Stack>
    </StyledPressable>
  )

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 }}
        >
          <StepDots count={3} index={dotIndex} />

          {step === 'name' && (
            <Stack gap={24}>
              <Stack alignItems="center" gap={12}>
                <HeroIcon name="compass" />
                <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center">What are you studying?</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24 }}>
                  Any subject or course, from secondary school to professional exams. No institution needed.
                </Text>
              </Stack>
              <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Stack gap={16}>
                  <StyledForm.Input
                    label="Subject or course name" placeholder="e.g. Biology, Python Programming, IELTS Prep"
                    value={title} onChangeText={setTitle} colors={getFieldColors(C)}
                  />
                  <Stack gap={8}>
                    <Text variant="label" color={C.textSecondary} fontWeight="600">Pick an icon</Text>
                    <Stack style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {EMOJIS.map((e) => (
                        <StyledPressable
                          key={e} onPress={() => setEmoji(e)}
                          width={48} height={48} borderRadius={14}
                          backgroundColor={emoji === e ? C.primaryBg : C.bgMuted}
                          alignItems="center" justifyContent="center"
                          borderWidth={emoji === e ? 2 : 1} borderColor={emoji === e ? C.primary : C.border}
                        >
                          <Text style={{ fontSize: 22 }}>{e}</Text>
                        </StyledPressable>
                      ))}
                    </Stack>
                  </Stack>
                </Stack>
              </StyledCard>
              <StyledButton backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
                onPress={handleCreateCourse} style={primaryShadow}
              >
                <Text variant="button" color={C.white}>Create my course</Text>
              </StyledButton>
              <StyledButton backgroundColor="transparent" borderRadius={16} paddingVertical={10} onPress={finish}>
                <Text variant="body" color={C.textSecondary}>Skip for now</Text>
              </StyledButton>
            </Stack>
          )}

          {step === 'content' && (
            <Stack gap={20}>
              <Stack alignItems="center" gap={12}>
                <Text style={{ fontSize: 44 }}>{emoji}</Text>
                <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center">Add your first content</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24 }}>
                  How would you like to add study material to {title}?
                </Text>
              </Stack>
              <Stack style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
                <OptionCard icon="file-text" tone="chat" title="Upload a file" desc="PDF, TXT or Markdown" onPress={handleUploadFile} />
                <OptionCard icon="clipboard" tone="quiz" title="Paste text" desc="Article, notes or transcript"
                  onPress={() => router.push({ pathname: '/setup/paste-text', params: { moduleId: moduleId || '' } })}
                />
                <OptionCard icon="camera" tone="flash" title="Scan a document" desc="Photo of a page or notes" onPress={handleScan} />
                <OptionCard icon="cpu" title="Generate with AI" desc="AI creates a study guide" dark onPress={() => setStep('generate')} />
              </Stack>
              <StyledButton backgroundColor={C.bgCard} borderRadius={16} paddingVertical={14}
                borderWidth={1} borderColor={C.border} onPress={() => setStep('ready')}
              >
                <Text variant="button" color={C.textSecondary}>{hasContent ? 'Continue' : 'Skip for now'}</Text>
              </StyledButton>
            </Stack>
          )}

          {step === 'generate' && (
            <Stack gap={20}>
              <Stack alignItems="center" gap={12}>
                <HeroIcon name="cpu" tone="navy" />
                <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center">Generate study material</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24 }}>
                  Tell the AI what to write a study guide about. Be specific for better results.
                </Text>
              </Stack>
              <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Stack gap={16}>
                  <Stack gap={8}>
                    <Text variant="label" color={C.textSecondary} fontWeight="600">Topic</Text>
                    <Stack backgroundColor={C.bgInput} borderRadius={14} borderWidth={1} borderColor={C.border}
                      paddingHorizontal={16} paddingVertical={12} style={{ minHeight: 80 }}
                    >
                      <TextInput
                        value={topic} onChangeText={setTopic} multiline maxLength={500}
                        placeholder="e.g. Python data types and variables for beginners"
                        placeholderTextColor={C.textMuted}
                        style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 22 }}
                      />
                    </Stack>
                  </Stack>
                  <Stack gap={8}>
                    <Text variant="label" color={C.textSecondary} fontWeight="600">Your level</Text>
                    {LEVELS.map(({ key, label, desc }) => {
                      const on = level === key
                      return (
                        <StyledPressable key={key} onPress={() => setLevel(key)}>
                          <Stack
                            horizontal alignItems="center" gap={12} borderRadius={12} padding={12}
                            backgroundColor={on ? C.primaryBg : C.bgMuted}
                            style={{ borderWidth: 1.5, borderColor: on ? C.primary : C.border }}
                          >
                            <Stack flex={1}>
                              <Text variant="label" color={on ? C.primary : C.textPrimary} fontWeight={on ? '700' : '500'}>{label}</Text>
                              <Text variant="caption" color={C.textSecondary}>{desc}</Text>
                            </Stack>
                            {on && (
                              <Stack width={20} height={20} borderRadius={10} backgroundColor={C.primary}
                                alignItems="center" justifyContent="center"
                              >
                                <Feather name="check" size={12} color={C.white} />
                              </Stack>
                            )}
                          </Stack>
                        </StyledPressable>
                      )
                    })}
                  </Stack>
                </Stack>
              </StyledCard>
              <Stack gap={10}>
                <StyledButton backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
                  onPress={handleGenerate} style={primaryShadow}
                >
                  <Text variant="button" color={C.white}>Generate study material</Text>
                </StyledButton>
                <StyledButton backgroundColor={C.bgCard} borderRadius={16} paddingVertical={14}
                  borderWidth={1} borderColor={C.border} onPress={() => setStep('content')}
                >
                  <Text variant="button" color={C.textSecondary}>Back</Text>
                </StyledButton>
              </Stack>
            </Stack>
          )}

          {step === 'ready' && (
            <Stack gap={24} alignItems="center">
              <HeroIcon name="check" size={100} tone="success" />
              <Stack alignItems="center" gap={8}>
                <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center">You're all set!</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24, maxWidth: 290 }}>
                  {hasContent
                    ? 'Your study material is ready. Use the AI Tutor, Quiz, Flashcards and Summary to start learning.'
                    : 'Your course is ready. Add study material anytime from the Documents tab.'}
                </Text>
              </Stack>
              <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20}
                style={{ borderWidth: 1, borderColor: C.border, alignSelf: 'stretch' }}
              >
                <Stack gap={14}>
                  {FEATURES.map((f) => (
                    <Stack key={f.label} horizontal alignItems="center" gap={14}>
                      <Stack width={40} height={40} borderRadius={12}
                        backgroundColor={{ chat: C.chatBg, quiz: C.quizBg, flash: C.flashBg, sum: C.sumBg }[f.tone]}
                        alignItems="center" justifyContent="center"
                      >
                        <Feather name={f.icon} size={18}
                          color={{ chat: C.chatColor, quiz: C.quizColor, flash: C.flashColor, sum: C.sumColor }[f.tone]} />
                      </Stack>
                      <Stack flex={1} gap={2}>
                        <Text variant="label" color={C.textPrimary} fontWeight="700">{f.label}</Text>
                        <Text variant="caption" color={C.textSecondary}>{f.desc}</Text>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </StyledCard>
              <StyledButton backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
                onPress={finish} style={[primaryShadow, { alignSelf: 'stretch' }]}
              >
                <Text variant="button" color={C.white}>Start learning</Text>
              </StyledButton>
            </Stack>
          )}
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
