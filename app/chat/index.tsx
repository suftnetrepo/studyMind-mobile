import React, { useRef, useEffect } from 'react'
import { Platform, FlatList, KeyboardAvoidingView, TextInput } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, Stack, StyledPressable, StyledCard, useActionSheet, useToast,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { RichText } from '../../src/components/RichText'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useChat, type ChatMessage, type ScopeMode } from '../../src/hooks'
import { copyToClipboard, shareText, formatConversationForExport } from '../../src/utils/share'

export default function ChatScreen() {
  const C       = useColors()
  const isDark  = useIsDark()
  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const { activeModuleId, activeModuleTitle, activeCourseCode } = useModuleStore()
  const { sessionId: initialSessionId, scope: initialScope } =
    useLocalSearchParams<{ sessionId?: string; scope?: ScopeMode }>()

  const {
    messages, sending, setScopeMode, send, loadSession,
  } = useChat(activeModuleId)

  const actionSheet = useActionSheet()
  const toast        = useToast()

  const [input, setInput] = React.useState('')

  useEffect(() => {
    if (initialSessionId) loadSession(initialSessionId)
  }, [initialSessionId, loadSession])

  useEffect(() => {
    if (initialScope) setScopeMode(initialScope)
  }, [initialScope, setScopeMode])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
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
          <Feather name="book-open" size={14} color={C.primary} />
        </Stack>

        <StyledPressable
          backgroundColor={C.bgCard}
          borderRadius={20} borderTopLeftRadius={5}
          borderWidth={1} borderColor={C.border}
          paddingHorizontal={16} paddingVertical={14}
          style={{ maxWidth: '88%' }}
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

          {/* Source citations */}
          {item.sources && item.sources.length > 0 && (
            <Stack marginTop={10} gap={5}>
              {item.sources.slice(0, 2).map((s: any, i: number) => (
                <Stack
                  key={i} horizontal alignItems="center" gap={7}
                  backgroundColor={C.primaryBg}
                  borderRadius={10} paddingHorizontal={10} paddingVertical={6}
                >
                  <Feather name="file-text" size={11} color={C.primary} />
                  <Text
                    variant="caption" color={C.primary} fontWeight="600"
                    numberOfLines={1} style={{ flex: 1 }}
                  >
                    {s.filename} · chunk {s.chunk_index}
                  </Text>
                  <Stack
                    backgroundColor={`${C.primary}20`} borderRadius={6}
                    paddingHorizontal={6} paddingVertical={2}
                  >
                    <Text variant="caption" color={C.primary} fontWeight="700">
                      {(s.relevance_score * 100).toFixed(0)}%
                    </Text>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
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
        title={activeCourseCode || 'AI Tutor'}
        subtitle={activeModuleTitle || undefined}
        onBackPress={() => router.back()}
        rightIcon={
          <StyledPressable
            onPress={() => {
              const text = formatConversationForExport(
                messages,
                activeCourseCode || 'AI Tutor',
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
          <Stack flex={1} alignItems="center" justifyContent="center" padding={32} gap={16}>
            <Stack
              width={72} height={72} borderRadius={22}
              backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
            >
              <Feather name="message-circle" size={30} color={C.primary} />
            </Stack>
            <Stack alignItems="center" gap={6}>
              <Text variant="title" color={C.textPrimary} fontWeight="800" textAlign="center">
                Ask anything
              </Text>
              <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 22 }}>
                I'll answer from your uploaded course materials with source citations.
              </Text>
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
          horizontal gap={10} alignItems="flex-end"
        >
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
              placeholder={`Ask about ${activeCourseCode || 'your materials'}…`}
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
            disabled={!input.trim() || sending}
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
