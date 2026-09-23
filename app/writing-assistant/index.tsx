import React, { useState, useRef, useEffect } from 'react'
import { Platform, TextInput, ScrollView, KeyboardAvoidingView, Modal } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import {
  StyledPage, Stack, StyledPressable, StyledCard,
  useToast, useLoader, useActionSheet,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { RichText, preprocessMath } from '../../src/components/RichText'
import { LoadingButton } from '../../src/components/LoadingButton'
import { FontSizeButton } from '../../src/components/FontSizeButton'
import { FontSizePopup } from '../../src/components/FontSizePopup'
import { useColors, useIsDark } from '../../src/constants'
import { shareText } from '../../src/utils/share'
import { quotaGate, incrementQuota } from '../../src/utils/quota'
import { writingService, chatService } from '../../src/services/api'

type WritingMode = 'general' | 'outline' | 'essay' | 'modify'

const MODES: { key: WritingMode; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'outline', label: 'Outline' },
  { key: 'essay',   label: 'Essay'   },
  { key: 'modify',  label: 'Modify'  },
]

const ESSAY_TYPES   = ['Expository', 'Reflection', 'Argumentative', 'Narrative', 'Descriptive']
const ESSAY_LEVELS  = ['Foundation', 'Intermediate', 'Advanced']
const ESSAY_LENGTHS = ['Short (300 words)', 'Medium (600 words)', 'Long (1000 words)']
const MODIFY_OPTIONS: { key: string; desc: string; icon: keyof typeof Feather.glyphMap; fg: string; bg: string }[] = [
  { key: 'Expand',           desc: 'Add more detail and depth',      icon: 'maximize-2', fg: 'primary',    bg: 'primaryBg' },
  { key: 'Shorten',          desc: 'Make it more concise',           icon: 'minimize-2', fg: 'quizColor',  bg: 'quizBg'    },
  { key: 'Continue Writing', desc: 'Keep the flow going',            icon: 'edit-3',     fg: 'flashColor', bg: 'flashBg'   },
  { key: 'Improve Grammar',  desc: 'Fix mistakes and improve clarity', icon: 'star',     fg: 'sumColor',   bg: 'sumBg'     },
  { key: 'Make Formal',      desc: 'Use a more professional tone',   icon: 'briefcase',  fg: 'error',      bg: 'errorBg'   },
  { key: 'Simplify',         desc: 'Make it easier to understand',   icon: 'sliders',    fg: 'chatColor',  bg: 'chatBg'    },
]
const MAX_INPUT = 5000
const FORMATS       = ['General', 'Email', 'Essay topic generator', 'Cover letter', 'Report']
const TONES         = ['Auto', 'Formal', 'Neutral', 'Casual', 'Persuasive']
const PARAGRAPHS    = ['3', '4', '5', '6', '7']

const PLACEHOLDERS: Record<WritingMode, string> = {
  general: 'Describe your topic here…',
  outline: 'Brief your ideas here to get a well-structured outline…',
  essay:   'Describe your essay topic here…',
  modify:  'Paste your text here…',
}

export default function WritingAssistantScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const actionSheet = useActionSheet()
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [busy, setBusy] = useState(false)
  const recordingRef = useRef<Audio.Recording | null>(null)
  recordingRef.current = recording
  useEffect(() => () => { recordingRef.current?.stopAndUnloadAsync().catch(() => {}) }, [])

  const [mode,       setMode]       = useState<WritingMode>('general')
  const [input,      setInput]      = useState('')
  const [result,     setResult]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [sheetOpen,  setSheetOpen]  = useState(false)
  const [fontSizeOpen, setFontSizeOpen] = useState(false)

  const [format,      setFormat]      = useState('General')
  const [tone,        setTone]        = useState('Auto')
  const [essayType,   setEssayType]   = useState('Expository')
  const [essayLevel,  setEssayLevel]  = useState('Foundation')
  const [essayLength, setEssayLength] = useState('Medium (600 words)')
  const [paragraphs,  setParagraphs]  = useState('5')
  const [modifyType,  setModifyType]  = useState('Expand')

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast.warning('Enter some text', 'Type your topic or paste text to get started.')
      return
    }
    if (!(await quotaGate('smart_writer'))) return
    setGenerating(true)
    setResult('')
    try {
      const res = await writingService.generate({
        mode,
        input:       input.trim(),
        format:      mode === 'general' ? format      : undefined,
        tone:        mode === 'general' ? tone        : undefined,
        essay_type:  mode === 'essay'   ? essayType   : undefined,
        level:       mode === 'essay'   ? essayLevel  : undefined,
        length:      mode === 'essay'   ? essayLength : undefined,
        paragraphs:  mode === 'essay'   ? paragraphs  : undefined,
        modify_type: mode === 'modify'  ? modifyType  : undefined,
      })
      await incrementQuota('smart_writer')
      setResult(res.content)
      setSheetOpen(true)
    } catch (e: any) {
      toast.error('Generation failed', e.message)
    } finally {
      setGenerating(false)
    }
  }

  const appendInput = (text: string) =>
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text).slice(0, MAX_INPUT))

  const scanFrom = async (source: 'camera' | 'gallery') => {
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
      const loadId = loader.show({ label: 'Reading image…', variant: 'dots' })
      setBusy(true)
      try {
        const { text } = await chatService.extractFromImage(asset.base64!, asset.mimeType || 'image/jpeg')
        await incrementQuota('scan_image')
        if (!text?.trim()) toast.warning('No text found', 'Try again with the text in clear view.')
        else appendInput(text)
      } finally {
        loader.hide(loadId)
        setBusy(false)
      }
    } catch (e: any) {
      toast.error('Could not read image', e.message)
    }
  }

  const handleAttach = () =>
    actionSheet.show({
      title: 'Add text from an image',
      items: [
        { icon: '📷', label: 'Take a photo',        onPress: () => scanFrom('camera')  },
        { icon: '🖼️', label: 'Choose from gallery', onPress: () => scanFrom('gallery') },
      ],
    })

  const handleMic = async () => {
    if (!recording) {
      try {
        const { status } = await Audio.requestPermissionsAsync()
        if (status !== 'granted') {
          toast.warning('Microphone needed', 'Allow microphone access to dictate.')
          return
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
        const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
        setRecording(rec)
      } catch (e: any) {
        toast.error('Recording failed', e.message)
      }
      return
    }
    const rec = recording
    setRecording(null)
    const loadId = loader.show({ label: 'Transcribing…', variant: 'dots' })
    setBusy(true)
    try {
      await rec.stopAndUnloadAsync()
      const uri = rec.getURI()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
      if (!uri) return
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
      const { text } = await chatService.transcribeAudio(base64)
      if (!text?.trim()) toast.warning('Nothing heard', 'Try speaking a little closer to the microphone.')
      else appendInput(text)
    } catch (e: any) {
      toast.error('Transcription failed', e.message)
    } finally {
      loader.hide(loadId)
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    await Clipboard.setStringAsync(preprocessMath(result))
    toast.success('Copied!', 'Text copied to clipboard.')
  }

  const Label = ({ children }: { children: string }) => (
    <Text paddingHorizontal={8} variant="label" color={C.textMuted} >{children}</Text>
  )

  const Pill = ({ value, current, onPress }: { value: string; current: string; onPress: () => void }) => {
    const on = current === value
    return (
      <StyledPressable
        onPress={onPress}
        backgroundColor={on ? C.primary : C.bgCard}
        borderRadius={100} paddingHorizontal={14} paddingVertical={8}
        borderWidth={1} borderColor={on ? C.primary : C.border}
      >
        <Text variant="caption" color={on ? C.white : C.textSecondary} fontWeight={on ? '700' : '500'}>
          {value}
        </Text>
      </StyledPressable>
    )
  }

  const PillRow = ({ title, options, value, onChange }: {
    title: string; options: string[]; value: string; onChange: (v: string) => void
  }) => (
    <Stack gap={8}>
      <Label>{title}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Stack horizontal gap={8}>
          {options.map((o) => <Pill key={o} value={o} current={value} onPress={() => onChange(o)} />)}
        </Stack>
      </ScrollView>
    </Stack>
  )

  const RadioList = ({ title, options, value, onChange }: {
    title: string; options: string[]; value: string; onChange: (v: string) => void
  }) => (
    <Stack gap={8}>
      <Label>{title}</Label>
      <Stack gap={8}>
        {options.map((o) => {
          const on = value === o
          return (
            <StyledPressable
              key={o} onPress={() => onChange(o)}
              backgroundColor={on ? C.primaryBg : C.bgCard}
              borderRadius={12} padding={13}
              borderWidth={1.5} borderColor={on ? C.primary : C.border}
            >
              <Stack horizontal alignItems="center" justifyContent="space-between">
                <Text variant="body" color={on ? C.primary : C.textPrimary} fontWeight={on ? '700' : '400'}>
                  {o}
                </Text>
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
  )

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader
        title="Smart Writer"
        subtitle="AI-powered writing tools"
        onBackPress={() => router.back()}
      />

      <Stack
        horizontal backgroundColor={C.bgCard} borderRadius={24} padding={4}
        marginHorizontal={16} marginTop={16} marginBottom={4}
        style={{ borderWidth: 1, borderColor: C.border }}
      >
        {MODES.map((m) => {
          const on = mode === m.key
          return (
            <StyledPressable
              key={m.key} style={{ flex: 1 }}
              onPress={() => { setMode(m.key); setResult('') }}
            >
              <Stack
                alignItems="center" paddingVertical={10} borderRadius={20}
                backgroundColor={on ? C.primaryBg : 'transparent'}
              >
                <Text variant="label" color={on ? C.primary : C.textSecondary}
                  fontWeight={on ? '700' : '500'} style={{ fontSize: 13 }}
                >
                  {m.label}
                </Text>
              </Stack>
            </StyledPressable>
          )
        })}
      </Stack>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Stack
            backgroundColor={C.bgCard} borderRadius={20}
            borderWidth={1} borderColor={C.border}
            padding={16} marginBottom={22}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={recording ? 'Listening… tap the mic to finish' : PLACEHOLDERS[mode]}
              placeholderTextColor={C.textMuted}
              maxLength={MAX_INPUT}
              multiline
              style={{
                color: C.textPrimary, fontSize: 15,
                fontFamily: 'PlusJakartaSans_400Regular',
                lineHeight: 22, minHeight: 96, textAlignVertical: 'top',
              }}
            />
            <Stack horizontal alignItems="center" justifyContent="space-between" marginTop={12}>
              <Stack horizontal gap={10}>
                <StyledPressable
                  onPress={handleAttach} disabled={busy || !!recording}
                  width={40} height={40} borderRadius={13}
                  backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
                  style={{ opacity: busy || recording ? 0.4 : 1 }}
                >
                  <Feather name="paperclip" size={17} color={C.textPrimary} />
                </StyledPressable>
                <StyledPressable
                  onPress={handleMic} disabled={busy}
                  width={40} height={40} borderRadius={13}
                  backgroundColor={recording ? C.error : C.bgMuted}
                  alignItems="center" justifyContent="center"
                  style={{ opacity: busy ? 0.4 : 1 }}
                >
                  <Feather name={recording ? 'square' : 'mic'} size={17}
                    color={recording ? C.white : C.textPrimary} />
                </StyledPressable>
              </Stack>
              <Text variant="caption" color={C.textMuted}>
                {input.length.toLocaleString()}/{MAX_INPUT.toLocaleString()}
              </Text>
            </Stack>
          </Stack>

          {mode === 'general' && (
            <Stack gap={16} marginBottom={16}>
              <PillRow title="Format" options={FORMATS} value={format} onChange={setFormat} />
              <PillRow title="Tone"   options={TONES}   value={tone}   onChange={setTone} />
            </Stack>
          )}

          {mode === 'essay' && (
            <Stack gap={14} marginBottom={16}>
              <PillRow title="Type" options={ESSAY_TYPES} value={essayType} onChange={setEssayType} />

              <Stack gap={8}>
                <Label>Proficiency Level</Label>
                <Stack horizontal gap={8}>
                  {ESSAY_LEVELS.map((l) => {
                    const on = essayLevel === l
                    return (
                      <StyledPressable
                        key={l} flex={1} onPress={() => setEssayLevel(l)}
                        backgroundColor={on ? C.primaryBg : C.bgCard}
                        borderRadius={12} paddingVertical={10} alignItems="center"
                        borderWidth={1.5} borderColor={on ? C.primary : C.border}
                      >
                        <Text variant="caption" color={on ? C.primary : C.textSecondary} fontWeight={on ? '700' : '500'}>
                          {l}
                        </Text>
                      </StyledPressable>
                    )
                  })}
                </Stack>
              </Stack>

              <RadioList title="Length" options={ESSAY_LENGTHS} value={essayLength} onChange={setEssayLength} />

              <Stack gap={8}>
                <Label>Paragraph number</Label>
                <Stack horizontal gap={8}>
                  {PARAGRAPHS.map((n) => {
                    const on = paragraphs === n
                    return (
                      <StyledPressable
                        key={n} flex={1} onPress={() => setParagraphs(n)}
                        backgroundColor={on ? C.primary : C.bgCard}
                        borderRadius={10} paddingVertical={10} alignItems="center"
                        borderWidth={1} borderColor={on ? C.primary : C.border}
                      >
                        <Text variant="label" color={on ? C.white : C.textSecondary} fontWeight="700">{n}</Text>
                      </StyledPressable>
                    )
                  })}
                </Stack>
              </Stack>
            </Stack>
          )}

          {mode === 'modify' && (
            <Stack marginBottom={20} gap={4}>
             
              <Text paddingHorizontal={16} variant="bodySmall" color={C.textSecondary} style={{ marginBottom: 10 }}>
                Choose how you'd like to modify your text.
              </Text>
              <Stack gap={10}>
                {MODIFY_OPTIONS.map((o) => {
                  const on = modifyType === o.key
                  const fg = (C as any)[o.fg] as string
                  return (
                    <StyledPressable key={o.key} onPress={() => setModifyType(o.key)}>
                      <Stack
                        horizontal alignItems="center" gap={14}
                        backgroundColor={on ? C.primaryBg : C.bgCard}
                        borderRadius={18} padding={14}
                        style={{ borderWidth: 1.5, borderColor: on ? C.primary : C.border }}
                      >
                        <Stack
                          width={48} height={48} borderRadius={14}
                          backgroundColor={(C as any)[o.bg]} alignItems="center" justifyContent="center"
                        >
                          <Feather name={o.icon} size={20} color={fg} />
                        </Stack>
                        <Stack flex={1} gap={2}>
                          <Text variant="label" color={C.textPrimary} fontWeight="700" style={{ fontSize: 15 }}>
                            {o.key}
                          </Text>
                          <Text variant="caption" color={C.textSecondary}>{o.desc}</Text>
                        </Stack>
                        <Stack
                          width={24} height={24} borderRadius={12}
                          alignItems="center" justifyContent="center"
                          backgroundColor={on ? C.primary : 'transparent'}
                          style={{ borderWidth: 1.5, borderColor: on ? C.primary : C.border }}
                        >
                          {on && <Feather name="check" size={14} color={C.white} />}
                        </Stack>
                      </Stack>
                    </StyledPressable>
                  )
                })}
              </Stack>
            </Stack>
          )}

          <LoadingButton
            backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
            marginBottom={result ? 20 : 0}
            loading={generating}
            onPress={handleGenerate} label="Generate"
            style={{
              shadowColor: C.primary, shadowOpacity: 0.35,
              shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7,
            }}
          />

          {result !== '' && (
            <StyledPressable onPress={() => setSheetOpen(true)} style={{ alignSelf: 'center', marginTop: 14 }}>
              <Stack horizontal alignItems="center" gap={6} paddingVertical={6}>
                <Feather name="file-text" size={14} color={C.primary} />
                <Text variant="bodySmall" color={C.primary} fontWeight="600">View last result</Text>
              </Stack>
            </StyledPressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={sheetOpen} animationType="slide" presentationStyle="fullScreen"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Stack flex={1} backgroundColor={C.bg} style={{ paddingTop: Platform.OS === 'ios' ? 54 : 24 }}>
          <Stack
            horizontal alignItems="center" justifyContent="flex-end" gap={8}
            paddingHorizontal={16} paddingBottom={8}
          >
            <FontSizeButton onPress={() => setFontSizeOpen(true)} />
            <StyledPressable
              onPress={handleCopy}
              width={38} height={38} borderRadius={12}
              backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
            >
              <Feather name="copy" size={16} color={C.primary} />
            </StyledPressable>
            <StyledPressable
              onPress={() => shareText(preprocessMath(result), 'smart-writer.txt', toast)}
              width={38} height={38} borderRadius={12}
              backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
            >
              <Feather name="share" size={16} color={C.primary} />
            </StyledPressable>
            <StyledPressable
              onPress={() => setSheetOpen(false)}
              width={38} height={38} borderRadius={12}
              backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
            >
              <Feather name="x" size={18} color={C.textPrimary} />
            </StyledPressable>
          </Stack>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            <RichText content={result} fontSize={15} />
          </ScrollView>
        </Stack>
      </Modal>
      <FontSizePopup visible={fontSizeOpen} onClose={() => setFontSizeOpen(false)} />
    </StyledPage>
  )
}
