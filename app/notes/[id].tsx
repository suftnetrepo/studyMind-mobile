import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Platform, TextInput, ScrollView, KeyboardAvoidingView, AppState, TouchableWithoutFeedback, Keyboard } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, Stack, StyledPressable,
  useActionSheet,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { FontSizeButton } from '../../src/components/FontSizeButton'
import { FontSizePopup } from '../../src/components/FontSizePopup'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore, useReaderFontStore } from '../../src/stores'
import { useNotes } from '../../src/hooks/useNotes'
import { getNoteById, type Note } from '../../src/db/notes'

export default function NoteEditorScreen() {
  const C       = useColors()
  const isDark  = useIsDark()
  const { id }  = useLocalSearchParams<{ id: string }>()
  const { activeModuleId, activeCourseCode } = useModuleStore()
  const { updateNote, syncNoteToBackend, syncingId, deleteNote } = useNotes(activeModuleId)
  const actionSheet = useActionSheet()

  // Read the note synchronously so the first render already has its text (loading it in an effect
  // painted an empty screen for a frame before the content appeared).
  const [note,    setNote]    = useState<Note | null>(() => (id ? getNoteById(id) : null))
  const [content, setContent] = useState(() => (id ? getNoteById(id)?.content ?? '' : ''))
  const [input,   setInput]   = useState('')
  const [fontSizeOpen, setFontSizeOpen] = useState(false)
  const readerScale = useReaderFontStore((s) => s.scale)
  const [sel,     setSel]     = useState({ start: 0, end: 0 })
  const inputRef  = useRef<TextInput>(null)
  const scrollRef = useRef<ScrollView>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reached via a route that used router.replace (e.g. the Notes tab
  // redirect) has no history to go back to — fall back to home instead of
  // letting router.back() throw "GO_BACK was not handled by any navigator".
  const goBack = () => {
    flushRef.current()
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)' as any)
  }

  useEffect(() => {
    if (id) {
      const n = getNoteById(id)
      if (n) { setNote(n); setContent(n.content) }
    }
  }, [id])

  // Auto-save: write shortly after typing stops, and flush immediately whenever the screen loses
  // focus, unmounts or the app goes to the background, so nothing typed can be lost.
  const latest    = useRef({ note: null as Note | null, content: '' })
  const dirty     = useRef(false)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  latest.current = { note, content }

  const flushSave = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
    const { note: n, content: c } = latest.current
    if (!dirty.current || !n) return
    dirty.current = false
    updateNote(n.id, c)
    setNote((prev) => (prev ? { ...prev, synced: false } : prev))
    setSaveState('saved')
  }, [updateNote])

  const flushRef = useRef(flushSave)
  flushRef.current = flushSave

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st !== 'active') flushRef.current() })
    return () => { sub.remove(); flushRef.current() }
  }, [])

  const handleContentChange = useCallback((text: string) => {
    latest.current.content = text
    setContent(text)
    dirty.current = true
    setSaveState('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => flushRef.current(), 500)
  }, [])

  const handleSync = async (n: Note) => {
    const ok = await syncNoteToBackend(n)
    if (ok) setNote((prev) => (prev ? { ...prev, synced: true } : prev))
    return ok
  }

  const handleEnsureSynced = async (n: Note) => {
    if (n.synced) return true
    return handleSync(n)
  }

  // Insert a line break at the cursor of the composer, so a note can hold several lines per entry.
  const handleNewLine = () => {
    const at = Math.min(sel.start, input.length)
    const to = Math.min(sel.end, input.length)
    setInput(input.slice(0, at) + '\n' + input.slice(to))
    inputRef.current?.focus()
  }

  // Append new input as a new paragraph
  const handleSend = () => {
    if (!input.trim()) return
    const newContent = content
      ? content + '\n' + input.trim()
      : input.trim()
    setContent(newContent)
    setInput('')
    if (note) {
      updateNote(note.id, newContent)
      setNote((prev) => (prev ? { ...prev, synced: false } : prev))
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }

  // Syncs first if the note hasn't been saved to AI yet, then navigates —
  // so "Chat about this note" etc. always has content to actually work
  // with, instead of silently doing nothing useful for an unsynced note.
  const goToAIFeature = async (route: string) => {
    if (!note) return
    const ok = await handleEnsureSynced(note)
    if (ok) router.push(route as any)
  }

  const handleActions = () => {
    actionSheet.show({
      title: 'Note actions',
      items: [
        {
          icon: '🤖',
          label: note?.synced ? 'Re-sync to AI' : 'Save to AI (make searchable)',
          onPress: () => note && handleSync(note),
        },
        {
          icon: '💬',
          label: 'Chat about this note',
          onPress: () => goToAIFeature('/chat'),
        },
        {
          icon: '📝',
          label: 'Generate quiz from note',
          onPress: () => goToAIFeature('/quiz'),
        },
        {
          icon: '🃏',
          label: 'Generate flashcards',
          onPress: () => goToAIFeature('/flashcards'),
        },
        {
          icon: '📋',
          label: 'Summarise this note',
          onPress: () => goToAIFeature('/summary'),
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
          <Stack horizontal gap={8}>
            <FontSizeButton onPress={() => setFontSizeOpen(true)} />
            <StyledPressable
              width={38} height={38} borderRadius={11}
              backgroundColor={C.bgMuted}
              alignItems="center" justifyContent="center"
              onPress={handleActions}
            >
              <Feather name="more-horizontal" size={18} color={C.textPrimary} />
            </StyledPressable>
          </Stack>
        }
      />
      <FontSizePopup visible={fontSizeOpen} onClose={() => setFontSizeOpen(false)} />

      {/* Status and actions */}
      {note && (() => {
        const isSyncing = syncingId === note.id
        const synced    = !!note.synced
        return (
          <Stack horizontal alignItems="center" gap={10} paddingHorizontal={20} paddingTop={16} paddingBottom={10}>
            <StyledPressable onPress={flushSave} hitSlop={6}>
              <Stack horizontal alignItems="center" gap={7} borderRadius={100}
                paddingHorizontal={14} paddingVertical={8}
                backgroundColor={saveState === 'saved' ? C.successBg : C.bgMuted}
              >
                <Feather name={saveState === 'saved' ? 'check-circle' : 'loader'} size={14}
                  color={saveState === 'saved' ? C.success : C.textMuted} />
                <Text variant="caption" fontWeight="700"
                  color={saveState === 'saved' ? C.success : C.textSecondary}
                >
                  {saveState === 'saved' ? 'Saved' : 'Saving…'}
                </Text>
              </Stack>
            </StyledPressable>

            <StyledPressable onPress={() => handleSync(note)} disabled={isSyncing} hitSlop={6}>
              <Stack horizontal alignItems="center" gap={7} borderRadius={100}
                paddingHorizontal={14} paddingVertical={8}
                backgroundColor={synced ? C.flashBg : C.sumBg}
                style={isSyncing ? { opacity: 0.6 } : undefined}
              >
                <Feather name={synced ? 'check' : 'upload-cloud'} size={14}
                  color={synced ? C.flashColor : C.sumColor} />
                <Text variant="caption" fontWeight="700" color={synced ? C.flashColor : C.sumColor}>
                  {isSyncing ? 'Syncing…' : synced ? 'AI ready' : 'Sync to AI'}
                </Text>
              </Stack>
            </StyledPressable>
          </Stack>
        )
      })()}

      {/* Note content area */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 16, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            value={content}
            onChangeText={handleContentChange}
            multiline
            editable
            onBlur={flushSave}
            scrollEnabled={false}
            style={{
              color:      C.textPrimary,
              fontSize:   15 * readerScale,
              fontFamily: 'PlusJakartaSans_400Regular',
              lineHeight: 21 * readerScale,
              textAlignVertical: 'top',
              minHeight: 120,
            }}
            placeholder="Start writing your note here, or use the box below to add to it."
            placeholderTextColor={C.textMuted}
          />
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Input bar — like chat */}
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
            style={{ minHeight: 46, maxHeight: 140 }}
          >
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
              placeholder="Add to your notes..."
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
            />
          </Stack>
          <StyledPressable
            width={46} height={46} borderRadius={14}
            backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
            onPress={handleNewLine}
            accessibilityLabel="Insert new line"
          >
            <Feather name="corner-down-left" size={18} color={C.textPrimary} />
          </StyledPressable>
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
