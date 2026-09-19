import React, { useRef, useEffect } from 'react'
import { Platform, FlatList, KeyboardAvoidingView, TextInput } from 'react-native'
import { router } from 'expo-router'
import Marked from 'react-native-marked'
import {
  StyledPage, Stack, StyledPressable, StyledCard,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { ScopePill } from '../../src/components/ScopePill'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useChat, type ChatMessage, type ScopeMode } from '../../src/hooks'

const SCOPE_OPTIONS: { key: ScopeMode; label: string; desc: string; emoji: string }[] = [
  { key: 'everything',    label: 'Everything',  desc: 'Class materials + my notes', emoji: '🔍' },
  { key: 'class_only',    label: 'Class only',  desc: 'Lecturer materials only',    emoji: '🏫' },
  { key: 'personal_only', label: 'My notes',    desc: 'My personal uploads only',   emoji: '📝' },
]

const PROMPTS = [
  'What are the key topics covered?',
  'Summarise the main concepts',
  'What should I focus on for the exam?',
]

export default function ChatScreen() {
  const C       = useColors()
  const isDark  = useIsDark()
  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const { activeModuleId, activeModuleTitle, activeCourseCode } = useModuleStore()

  const {
    messages, sending, scopeMode, setScopeMode, send,
  } = useChat(activeModuleId)

  const [input,      setInput]      = React.useState('')
  const [showScope,  setShowScope]  = React.useState(false)

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

  const scopeDesc = [
    activeCourseCode || (activeModuleTitle ? activeModuleTitle.slice(0, 18) : 'All modules'),
    scopeMode === 'class_only'    ? 'Class only'  :
    scopeMode === 'personal_only' ? 'My notes'    : 'All materials',
  ].join(' · ')

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
          <Text style={{ fontSize: 14 }}>📚</Text>
        </Stack>

        <Stack
          backgroundColor={C.bgCard}
          borderRadius={20} borderTopLeftRadius={5}
          borderWidth={1} borderColor={C.border}
          paddingHorizontal={16} paddingVertical={14}
          style={{ maxWidth: '88%' }}
        >
          <Marked
            value={cleanAnswer}
            flatListProps={{
              scrollEnabled: false,
              style: { backgroundColor: 'transparent' },
            }}
            styles={{
              text:      { fontSize: 14, color: C.textPrimary, lineHeight: 22, fontFamily: 'PlusJakartaSans_400Regular' },
              strong:    { fontFamily: 'PlusJakartaSans_700Bold', color: C.textPrimary },
              paragraph: { marginBottom: 6 },
              li:        { marginBottom: 4 },
            }}
          />

          {/* Source citations */}
          {item.sources && item.sources.length > 0 && (
            <Stack marginTop={10} gap={5}>
              {item.sources.slice(0, 2).map((s: any, i: number) => (
                <Stack
                  key={i} horizontal alignItems="center" gap={7}
                  backgroundColor={C.primaryBg}
                  borderRadius={10} paddingHorizontal={10} paddingVertical={6}
                >
                  <Text style={{ fontSize: 11 }}>📄</Text>
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
        </Stack>
      </Stack>
    )
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader
        title={activeCourseCode ? `${activeCourseCode} — AI Tutor` : 'AI Tutor'}
        subtitle={activeModuleTitle || undefined}
        onBackPress={() => router.back()}
      />

      {/* Scope pill */}
      <Stack paddingHorizontal={20} paddingVertical={8}>
        <ScopePill description={scopeDesc} onPress={() => setShowScope((s) => !s)} />
      </Stack>

      {/* Scope picker */}
      {showScope && (
        <Stack
          marginHorizontal={20} marginBottom={8}
          backgroundColor={C.bgCard} borderRadius={16}
          borderWidth={1} borderColor={C.border}
          style={{ overflow: 'hidden' }}
        >
          {SCOPE_OPTIONS.map((opt, idx) => (
            <StyledPressable
              key={opt.key}
              onPress={() => { setScopeMode(opt.key); setShowScope(false) }}
              backgroundColor={scopeMode === opt.key ? C.primaryBg : C.bgCard}
              padding={14}
              borderBottomWidth={idx < SCOPE_OPTIONS.length - 1 ? 1 : 0}
              borderBottomColor={C.border}
            >
              <Stack horizontal alignItems="center" gap={12}>
                <Stack
                  width={36} height={36} borderRadius={10}
                  backgroundColor={scopeMode === opt.key ? `${C.primary}20` : C.bgMuted}
                  alignItems="center" justifyContent="center"
                >
                  <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                </Stack>
                <Stack flex={1} gap={2}>
                  <Text variant="label"
                    color={scopeMode === opt.key ? C.primary : C.textPrimary}
                    fontWeight={scopeMode === opt.key ? '700' : '500'}
                  >{opt.label}</Text>
                  <Text variant="caption" color={C.textSecondary}>{opt.desc}</Text>
                </Stack>
                {scopeMode === opt.key && (
                  <Stack
                    width={22} height={22} borderRadius={11}
                    backgroundColor={C.primary} alignItems="center" justifyContent="center"
                  >
                    <Text style={{ fontSize: 11, color: C.white, fontWeight: '700' }}>✓</Text>
                  </Stack>
                )}
              </Stack>
            </StyledPressable>
          ))}
        </Stack>
      )}

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
              <Text style={{ fontSize: 34 }}>💬</Text>
            </Stack>
            <Stack alignItems="center" gap={6}>
              <Text variant="title" color={C.textPrimary} fontWeight="800" textAlign="center">
                Ask anything
              </Text>
              <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 22 }}>
                I'll answer from your uploaded course materials with source citations.
              </Text>
            </Stack>
            <Stack gap={8} width="100%" marginTop={4}>
              {PROMPTS.map((p) => (
                <StyledPressable
                  key={p}
                  onPress={() => { setInput(p); inputRef.current?.focus() }}
                  backgroundColor={C.bgCard}
                  borderRadius={12} paddingHorizontal={14} paddingVertical={11}
                  horizontal alignItems="center" gap={10}
                  style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Text style={{ fontSize: 14 }}>💡</Text>
                  <Text variant="bodySmall" color={C.textSecondary} style={{ flex: 1 }}>{p}</Text>
                  <Text style={{ fontSize: 14, color: C.textMuted }}>›</Text>
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
          backgroundColor={C.bgCard}
          borderTopWidth={1} borderTopColor={C.border}
          paddingHorizontal={16} paddingTop={10}
          paddingBottom={Platform.OS === 'ios' ? 30 : 12}
          horizontal gap={10} alignItems="flex-end"
        >
          <Stack
            flex={1} backgroundColor={C.bgInput}
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
