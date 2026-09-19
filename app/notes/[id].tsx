import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Platform, TextInput, ScrollView, KeyboardAvoidingView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, Stack, StyledPressable,
  useActionSheet,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useNotes } from '../../src/hooks/useNotes'
import { getNoteById, type Note } from '../../src/db/notes'

export default function NoteEditorScreen() {
  const C       = useColors()
  const isDark  = useIsDark()
  const { id }  = useLocalSearchParams<{ id: string }>()
  const { activeModuleId, activeCourseCode } = useModuleStore()
  const { updateNote, syncNoteToBackend, deleteNote } = useNotes(activeModuleId)
  const actionSheet = useActionSheet()

  const [note,    setNote]    = useState<Note | null>(null)
  const [content, setContent] = useState('')
  const [input,   setInput]   = useState('')
  const scrollRef = useRef<ScrollView>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reached via a route that used router.replace (e.g. the Notes tab
  // redirect) has no history to go back to — fall back to home instead of
  // letting router.back() throw "GO_BACK was not handled by any navigator".
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))

  useEffect(() => {
    if (id) {
      const n = getNoteById(id)
      if (n) { setNote(n); setContent(n.content) }
    }
  }, [id])

  // Auto-save with 1s debounce
  const handleContentChange = useCallback((text: string) => {
    setContent(text)
    if (note) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        updateNote(note.id, text)
      }, 1000)
    }
  }, [note, updateNote])

  // Append new input as a new paragraph
  const handleSend = () => {
    if (!input.trim()) return
    const newContent = content
      ? content + '\n\n' + input.trim()
      : input.trim()
    setContent(newContent)
    setInput('')
    if (note) updateNote(note.id, newContent)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  const handleActions = () => {
    actionSheet.show({
      title: 'Note actions',
      items: [
        {
          icon: '🤖',
          label: 'Save to AI (make searchable)',
          onPress: () => note && syncNoteToBackend(note),
        },
        {
          icon: '💬',
          label: 'Chat about this note',
          onPress: () => router.push('/chat'),
        },
        {
          icon: '📝',
          label: 'Generate quiz from note',
          onPress: () => router.push('/quiz'),
        },
        {
          icon: '🃏',
          label: 'Generate flashcards',
          onPress: () => router.push('/flashcards'),
        },
        {
          icon: '📋',
          label: 'Summarise this note',
          onPress: () => router.push('/summary'),
        },
        {
          icon: '🗑',
          label: 'Delete note',
          variant: 'destructive',
          onPress: () => {
            if (note) { deleteNote(note.id); goBack() }
          },
        },
      ],
    })
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader
        title={note?.title || 'Note'}
        subtitle={`${note?.course_code || activeCourseCode || ''} · ${wordCount} words`}
        onBackPress={goBack}
        rightIcon={
          <StyledPressable
            width={38} height={38} borderRadius={11}
            backgroundColor={C.bgMuted}
            alignItems="center" justifyContent="center"
            onPress={handleActions}
          >
            <Feather name="more-horizontal" size={18} color={C.textPrimary} />
          </StyledPressable>
        }
      />

      {/* Note content area */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {content ? (
          <TextInput
            value={content}
            onChangeText={handleContentChange}
            multiline
            style={{
              color:      C.textPrimary,
              fontSize:   15,
              fontFamily: 'PlusJakartaSans_400Regular',
              lineHeight: 26,
              textAlignVertical: 'top',
            }}
            placeholder="Start writing your notes..."
            placeholderTextColor={C.textMuted}
          />
        ) : (
          <Stack alignItems="center" justifyContent="center" padding={40} gap={14}>
            <Stack
              width={72} height={72} borderRadius={22}
              backgroundColor={C.flashBg} alignItems="center" justifyContent="center"
            >
              <Feather name="edit-3" size={30} color={C.flashColor} />
            </Stack>
            <Text variant="subtitle" color={C.textPrimary} fontWeight="700" textAlign="center">
              Start your note
            </Text>
            <Text variant="body" color={C.textSecondary} textAlign="center">
              Type in the box below and tap Send to add to your note.
              Tap ⋯ to use AI features when ready.
            </Text>
          </Stack>
        )}

        {/* Sync status */}
        {note && (
          <Stack
            horizontal alignItems="center" gap={7} marginTop={16}
            backgroundColor={note.synced ? C.successBg : C.bgMuted}
            borderRadius={10} paddingHorizontal={12} paddingVertical={8}
            style={{ alignSelf: 'flex-start' }}
          >
            <Stack
              width={7} height={7} borderRadius={4}
              backgroundColor={note.synced ? C.success : C.warning}
            />
            <Text variant="caption" color={note.synced ? C.success : C.textSecondary} fontWeight="600">
              {note.synced ? 'Saved to AI' : 'Not yet saved to AI — tap ⋯ to sync'}
            </Text>
          </Stack>
        )}
      </ScrollView>

      {/* Input bar — like chat */}
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
            style={{ minHeight: 46, maxHeight: 140 }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Add to your notes..."
              placeholderTextColor={C.textMuted}
              multiline
              style={{
                color:      C.textPrimary,
                fontSize:   14,
                fontFamily: 'PlusJakartaSans_400Regular',
                lineHeight: 20,
              }}
            />
          </Stack>
          <StyledPressable
            width={46} height={46} borderRadius={14}
            backgroundColor={input.trim() ? C.flashColor : C.bgMuted}
            alignItems="center" justifyContent="center"
            onPress={handleSend}
            disabled={!input.trim()}
            style={input.trim() ? {
              shadowColor: C.flashColor, shadowOpacity: 0.35,
              shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
            } : undefined}
          >
            <Feather name="arrow-up" size={18} color={input.trim() ? C.white : C.textMuted} />
          </StyledPressable>
        </Stack>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
