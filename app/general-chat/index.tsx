import React, { useRef, useEffect, useState } from 'react'
import { Platform, FlatList, KeyboardAvoidingView, TextInput } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import {
  StyledPage, Stack, StyledPressable, StyledCard, useActionSheet, useToast, useLoader,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { RichText } from '../../src/components/RichText'
import { quotaGate, incrementQuota } from '../../src/utils/quota'
import { useColors, useIsDark } from '../../src/constants'
import { useGeneralChat, type ChatMessage, type ComplexityLevel } from '../../src/hooks'
import { chatService } from '../../src/services/api'
import { copyToClipboard, shareText, formatConversationForExport } from '../../src/utils/share'

const MAX_MESSAGE_CHARS = 8000

const COMPLEXITY_LEVELS: { key: ComplexityLevel; label: string; dot: 'success' | 'warning' | 'error' }[] = [
  { key: 'simple', label: 'Simple', dot: 'success' },   // "Explain like I'm 5"
  { key: 'normal', label: 'Normal', dot: 'warning' },
  { key: 'expert', label: 'Expert', dot: 'error'   },
]

const GENERAL_PROMPTS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'repeat',       text: 'Explain how recursion works with an example' },
  { icon: 'edit-3',       text: 'Help me improve this paragraph...' },
  { icon: 'globe',        text: 'What is the difference between AI and machine learning?' },
  { icon: 'hash',         text: 'Solve this maths problem step by step...' },
  { icon: 'zap',          text: 'Give me study tips for memorising complex topics' },
  { icon: 'thermometer',  text: 'Explain a scientific concept simply' },
]

export default function GeneralChatScreen() {
  const C       = useColors()
  const isDark  = useIsDark()
  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const { messages, sending, complexity, setComplexity, send } = useGeneralChat()

  const actionSheet = useActionSheet()
  const toast        = useToast()
  const loader       = useLoader()

  const [input, setInput] = React.useState('')
  const [busy,  setBusy]  = useState(false)          // scanning / transcribing
  const [recording,   setRecording]   = useState<Audio.Recording | null>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)
  recordingRef.current = recording
  const isRecording = recording !== null

  // Don't leave the microphone open if the screen is closed mid-recording.
  useEffect(() => () => {
    recordingRef.current?.stopAndUnloadAsync().catch(() => {})
  }, [])

  const appendToInput = (text: string) =>
    setInput((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text))

  // ── Scan & Solve: photo → text ──────────────────────────────────────────────
  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) return
    if (!(await quotaGate('scan_image'))) return
    const loadId = loader.show({ label: 'Reading image…', variant: 'dots' })
    setBusy(true)
    try {
      const extracted = await chatService.extractFromImage(asset.base64, asset.mimeType || 'image/jpeg')
      await incrementQuota('scan_image')
      if (!extracted.text?.trim()) {
        toast.warning('No text found', 'Try again with the text in clear view.')
        return
      }
      if (extracted.text.length > MAX_MESSAGE_CHARS) {
        appendToInput(extracted.text.slice(0, MAX_MESSAGE_CHARS))
        toast.info('Trimmed to fit', 'Only the first part fits in one message.')
      } else {
        appendToInput(extracted.text)
        toast.success('Text extracted!', 'Review and edit before sending.')
      }
    } catch (e: any) {
      toast.error('Could not read image', e.message)
    } finally {
      loader.hide(loadId)
      setBusy(false)
    }
  }

  const handleScanImage = async (source: 'camera' | 'gallery') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality:    0.6,
      base64:     true,
    }
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        toast.warning('Camera access needed', 'Allow camera access in Settings.')
        return
      }
      const result = await ImagePicker.launchCameraAsync(options)
      if (result.canceled || !result.assets[0]) return
      await processImage(result.assets[0])
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        toast.warning('Gallery access needed', 'Allow photo library access in Settings.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: false })
      if (result.canceled || !result.assets[0]) return
      await processImage(result.assets[0])
    }
  }

  const handleScanPress = () => {
    actionSheet.show({
      title: 'Add an image',
      items: [
        { icon: '📷', label: 'Take a photo',        onPress: () => handleScanImage('camera')  },
        { icon: '🖼️', label: 'Choose from gallery', onPress: () => handleScanImage('gallery') },
      ],
    })
  }

  // ── Voice input: record → Whisper → text ────────────────────────────────────
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        toast.warning('Microphone needed', 'Allow microphone access to use voice input.')
        return
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      )
      setRecording(rec)
    } catch (e: any) {
      toast.error('Recording failed', e.message)
    }
  }

  const stopRecording = async () => {
    if (!recording) return
    const rec = recording
    setRecording(null)
    let uri: string | null = null
    try {
      await rec.stopAndUnloadAsync()
      uri = rec.getURI()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
    } catch (e: any) {
      toast.error('Recording failed', e.message)
      return
    }
    if (!uri) return

    const loadId = loader.show({ label: 'Transcribing…', variant: 'dots' })
    setBusy(true)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const result = await chatService.transcribeAudio(base64)
      if (!result.text?.trim()) {
        toast.warning('Nothing heard', 'Try speaking a little closer to the microphone.')
        return
      }
      appendToInput(result.text)
      toast.success('Got it!', 'Review and tap send when ready.')
    } catch (e: any) {
      toast.error('Transcription failed', e.message)
    } finally {
      loader.hide(loadId)
      setBusy(false)
    }
  }

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    if (text.length > MAX_MESSAGE_CHARS) {
      toast.warning('Message too long', `Shorten it by ${(text.length - MAX_MESSAGE_CHARS).toLocaleString()} characters.`)
      return
    }
    setInput('')
    await send(text)
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.role === 'user') {
      return (
        <Stack alignItems="flex-end" marginBottom={14} marginHorizontal={20}>
          <Stack
            backgroundColor={C.primary}
            borderRadius={20} borderBottomRightRadius={5}
            paddingHorizontal={16} paddingVertical={12}
            style={{
              maxWidth: '82%',
              shadowColor: C.primary, shadowOpacity: 0.25,
              shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
            }}
          >
            <Text variant="body" color="#FFFFFF" style={{ lineHeight: 22 }}>{item.content}</Text>
          </Stack>
        </Stack>
      )
    }

    if (item.loading) {
      return (
        <Stack alignItems="flex-start" marginBottom={14} marginHorizontal={20}>
          <Stack
            backgroundColor={C.bgCard}
            borderRadius={20} borderBottomLeftRadius={5}
            borderWidth={1} borderColor={C.border}
            paddingHorizontal={18} paddingVertical={16}
            horizontal gap={6} alignItems="center"
          >
            {[0, 0.15, 0.3].map((delay, i) => (
              <Stack
                key={i} width={7} height={7} borderRadius={4}
                backgroundColor={C.primary} style={{ opacity: 0.4 + i * 0.2 }}
              />
            ))}
          </Stack>
        </Stack>
      )
    }

    // Strip inline citation tags like "[filename, chunk 3]" that the LLM
    // sometimes appends to the answer body — sources are shown separately below.
    const cleanAnswer = item.content
      .replace(/\[[^\]]*?(?:chunk|\.pdf|\.docx|\.txt|\.md)[^\]]*?\]/gi, '')
      .replace(/\[\s*[^,\]]+\s*,\s*chunk\s*\d+\s*\]/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return (
      <Stack alignItems="flex-start" marginBottom={14} marginHorizontal={20}>
        {/* Bot avatar */}
        <Stack
          width={28} height={28} borderRadius={8}
          backgroundColor={C.primaryBg}
          alignItems="center" justifyContent="center"
          marginBottom={5}
        >
          <Feather name="cpu" size={14} color={C.primary} />
        </Stack>

        <StyledPressable
          backgroundColor={C.bgCard}
          borderRadius={20} borderTopLeftRadius={5}
          borderWidth={1} borderColor={C.border}
          paddingHorizontal={16} paddingVertical={14}
          style={{ alignSelf: 'stretch' }}
          onLongPress={() => {
            actionSheet.show({
              title: 'Message options',
              items: [
                {
                  icon:    '📋',
                  label:   'Copy message',
                  onPress: () => copyToClipboard(cleanAnswer, toast),
                },
                {
                  icon:    '⬆️',
                  label:   'Share message',
                  onPress: () => shareText(cleanAnswer, 'studymind-message.txt', toast),
                },
              ],
            })
          }}
        >
          <RichText content={cleanAnswer} fontSize={14} />

        </StyledPressable>
      </Stack>
    )
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader
        title="AI Assistant"
        subtitle="Ask me anything"
        onBackPress={() => router.back()}
        rightIcon={
          <StyledPressable
            onPress={() => {
              const text = formatConversationForExport(
                messages,
                'AI Assistant',
              )
              shareText(text, 'studymind-conversation.txt', toast)
            }}
            width={38} height={38} borderRadius={11}
            backgroundColor={C.bgMuted}
            alignItems="center" justifyContent="center"
          >
            <Feather name="share" size={16} color={C.textPrimary} />
          </StyledPressable>
        }
      />

      {/* Complexity level */}
      <Stack horizontal paddingHorizontal={20} paddingTop={4} paddingBottom={8} gap={8}>
        {COMPLEXITY_LEVELS.map((level) => {
          const active = complexity === level.key
          return (
            <StyledPressable key={level.key} onPress={() => setComplexity(level.key)}>
              <Stack
                horizontal alignItems="center" gap={6}
                backgroundColor={active ? C.primaryBg : C.bgMuted}
                borderRadius={100} paddingHorizontal={12} paddingVertical={6}
                style={{ borderWidth: 1, borderColor: active ? C.primary : 'transparent' }}
              >
                <Stack width={7} height={7} borderRadius={4} backgroundColor={C[level.dot]} />
                <Text variant="caption"
                  color={active ? C.primary : C.textSecondary}
                  fontWeight={active ? '700' : '500'}
                >
                  {level.label}
                </Text>
              </Stack>
            </StyledPressable>
          )
        })}
      </Stack>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={{
          paddingTop: 12, paddingBottom: 16,
          flexGrow: messages.length === 0 ? 1 : 0,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Stack flex={1} alignItems="center" justifyContent="center" paddingHorizontal={20} gap={18}>
            <Stack
              width={72} height={72} borderRadius={22}
              backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
            >
              <Feather name="cpu" size={30} color={C.primary} />
            </Stack>
            <Stack alignItems="center" gap={6}>
              <Text variant="title" color={C.textPrimary} fontWeight="800" textAlign="center">
                Ask anything
              </Text>
              <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 22 }}>
                Not limited to your course materials. Try one of these:
              </Text>
            </Stack>
            <Stack horizontal style={{ flexWrap: 'wrap', gap: 10 }}>
              {GENERAL_PROMPTS.map((p) => (
                <StyledPressable
                  key={p.text} style={{ width: '48%' }}
                  onPress={() => { setInput(p.text); inputRef.current?.focus() }}
                >
                  <Stack
                    backgroundColor={C.bgCard} borderRadius={16} padding={12} gap={8}
                    style={{ borderWidth: 1, borderColor: C.border, minHeight: 92 }}
                  >
                    <Stack
                      width={30} height={30} borderRadius={9}
                      backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
                    >
                      <Feather name={p.icon} size={15} color={C.primary} />
                    </Stack>
                    <Text variant="caption" color={C.textPrimary} fontWeight="600" numberOfLines={3}>
                      {p.text}
                    </Text>
                  </Stack>
                </StyledPressable>
              ))}
            </Stack>
          </Stack>
        }
        style={{ flex: 1 }}
      />

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <Stack
          backgroundColor={C.bg}
          borderTopWidth={1} borderTopColor={C.border}
          paddingHorizontal={16} paddingTop={10}
          paddingBottom={Platform.OS === 'ios' ? 30 : 12}
          horizontal gap={8} alignItems="flex-end"
        >
          <StyledPressable
            width={40} height={46} borderRadius={14}
            backgroundColor={C.bgMuted}
            alignItems="center" justifyContent="center"
            onPress={handleScanPress}
            disabled={busy || isRecording || sending}
            style={{ opacity: busy || isRecording || sending ? 0.4 : 1 }}
          >
            <Feather name="camera" size={19} color={C.textPrimary} />
          </StyledPressable>
          <StyledPressable
            width={40} height={46} borderRadius={14}
            backgroundColor={isRecording ? C.error : C.bgMuted}
            alignItems="center" justifyContent="center"
            onPress={isRecording ? stopRecording : startRecording}
            disabled={busy || sending}
            style={[
              { opacity: busy || sending ? 0.4 : 1 },
              isRecording ? {
                shadowColor: C.error, shadowOpacity: 0.4,
                shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5,
              } : {},
            ]}
          >
            <Feather name={isRecording ? 'square' : 'mic'} size={18}
              color={isRecording ? C.white : C.textPrimary} />
          </StyledPressable>
          <Stack
            flex={1} backgroundColor={C.bgCard}
            borderRadius={18} borderWidth={1} borderColor={C.border}
            paddingHorizontal={16} paddingVertical={10}
            style={{ minHeight: 46, maxHeight: 120 }}
          >
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={isRecording ? 'Listening… tap ■ to finish' : 'Ask anything…'}
              placeholderTextColor={C.textMuted}
              multiline
              style={{
                color:      C.textPrimary,
                fontSize:   14,
                fontFamily: 'PlusJakartaSans_400Regular',
                lineHeight: 20,
                textAlignVertical: 'center',
                paddingVertical: 0,
              }}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </Stack>
          <StyledPressable
            width={46} height={46} borderRadius={14}
            backgroundColor={input.trim() && !sending ? C.primary : C.bgMuted}
            alignItems="center" justifyContent="center"
            onPress={handleSend}
            disabled={!input.trim() || sending || isRecording}
            style={input.trim() && !sending ? {
              shadowColor: C.primary, shadowOpacity: 0.35,
              shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
            } : undefined}
          >
            <Text style={{
              fontSize: 18,
              color: input.trim() && !sending ? C.white : C.textMuted,
            }}>↑</Text>
          </StyledPressable>
        </Stack>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
