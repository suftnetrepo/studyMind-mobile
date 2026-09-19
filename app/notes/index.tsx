import React, { useCallback } from 'react'
import { Platform } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton,
  useActionSheet,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, getBackArrowProps, getBackShapeProps } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useNotes } from '../../src/hooks/useNotes'

export default function NotesListScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { activeModuleId, activeCourseCode } = useModuleStore()
  const { notes, loadNotes, createNote, syncNoteToBackend, ensureSynced, deleteNote } = useNotes(activeModuleId)
  const actionSheet = useActionSheet()
  const backShape = getBackShapeProps(C)
  const backArrow = getBackArrowProps(C)

  // Reload every time this screen regains focus — e.g. coming back from the
  // editor after writing content. The screen stays mounted in the stack, so
  // the initial mount-time load alone would keep showing stale (empty) notes.
  useFocusEffect(
    useCallback(() => { loadNotes() }, [loadNotes]),
  )

  const handleNewNote = () => {
    const note = createNote(activeCourseCode || undefined)
    router.push(`/notes/${note.id}`)
  }

  const handleNotePress = (note: any) => {
    router.push(`/notes/${note.id}`)
  }

  // Syncs first if the note hasn't been saved to AI yet, then navigates —
  // so these actions always have content to actually work with, instead of
  // relying on the student having remembered to sync beforehand.
  const goToAIFeature = async (note: any, route: string) => {
    const ok = await ensureSynced(note)
    if (ok) router.push(route as any)
  }

  const handleNoteLongPress = (note: any) => {
    actionSheet.show({
      title: note.title,
      items: [
        {
          icon: '🤖',
          label: note.synced ? 'Re-sync to AI' : 'Save to AI (make searchable)',
          onPress: () => syncNoteToBackend(note),
        },
        {
          icon: '💬',
          label: 'Chat about this note',
          onPress: () => goToAIFeature(note, '/chat'),
        },
        {
          icon: '📝',
          label: 'Quiz from this note',
          onPress: () => goToAIFeature(note, '/quiz'),
        },
        {
          icon: '🃏',
          label: 'Flashcards from this note',
          onPress: () => goToAIFeature(note, '/flashcards'),
        },
        {
          icon: '📋',
          label: 'Summarise this note',
          onPress: () => goToAIFeature(note, '/summary'),
        },
        {
          icon: '🗑',
          label: 'Delete note',
          variant: 'destructive',
          onPress: () => deleteNote(note.id),
        },
      ],
    })
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20} horizontal alignItems="center" justifyContent="space-between">
          <Stack horizontal alignItems="center" gap={12}>
            <StyledPressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
              width={backShape.size} height={backShape.size}
              borderRadius={backShape.size / 2}
              backgroundColor={backShape.backgroundColor}
              borderWidth={backShape.borderWidth}
              borderColor={backShape.borderColor}
              alignItems="center" justifyContent="center"
            >
              <Feather name="arrow-left" size={backArrow.size} color={backArrow.color} />
            </StyledPressable>
            <Text variant="title" color={C.textPrimary} fontWeight="800">Notes</Text>
          </Stack>
          <StyledButton
            backgroundColor={C.flashColor} borderRadius={12}
            paddingHorizontal={16} paddingVertical={9}
            onPress={handleNewNote}
            style={{
              shadowColor: C.flashColor, shadowOpacity: 0.3,
              shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
            }}
          >
            <Text variant="label" color={C.white} fontWeight="700">+ New</Text>
          </StyledButton>
        </Stack>
      </StyledPage.Header.Full>

      <StyledScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {notes.length === 0 ? (
          <Stack alignItems="center" padding={48} gap={14}>
            <Stack
              width={80} height={80} borderRadius={24}
              backgroundColor={C.flashBg} alignItems="center" justifyContent="center"
            >
              <Feather name="edit-3" size={34} color={C.flashColor} />
            </Stack>
            <Text variant="title" color={C.textPrimary} fontWeight="700" textAlign="center">
              No notes yet
            </Text>
            <Text variant="body" color={C.textSecondary} textAlign="center">
              Tap "+ New" to start taking notes.
              Once written, save them to AI so the tutor, quiz, and flashcards can use them.
            </Text>
            <StyledButton
              backgroundColor={C.flashColor} borderRadius={14}
              paddingHorizontal={24} paddingVertical={12}
              onPress={handleNewNote}
              style={{
                shadowColor: C.flashColor, shadowOpacity: 0.35,
                shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
              }}
            >
              <Text variant="button" color={C.white}>Write my first note</Text>
            </StyledButton>
          </Stack>
        ) : (
          <Stack gap={10}>
            {notes.map((note) => {
              const preview  = note.content.slice(0, 120).replace(/\n/g, ' ')
              const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0
              const date     = new Date(note.updated_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short',
              })

              return (
                <StyledPressable
                  key={note.id}
                  onPress={() => handleNotePress(note)}
                  onLongPress={() => handleNoteLongPress(note)}
                >
                  <StyledCard
                    backgroundColor={C.bgCard} borderRadius={18} padding={16}
                    style={{ borderWidth: 1, borderColor: C.border }}
                  >
                    <Stack horizontal alignItems="flex-start" gap={12}>
                      <Stack flex={1} gap={5}>
                        <Stack horizontal alignItems="center" justifyContent="space-between">
                          <Text variant="label" color={C.textPrimary} fontWeight="700"
                            numberOfLines={1} style={{ flex: 1 }}
                          >
                            {note.title}
                          </Text>
                          <Text variant="caption" color={C.textMuted}>{date}</Text>
                        </Stack>
                        {preview ? (
                          <Text variant="bodySmall" color={C.textSecondary}
                            numberOfLines={2} style={{ lineHeight: 20 }}
                          >
                            {preview}
                          </Text>
                        ) : (
                          <Text variant="caption" color={C.textMuted} style={{ fontStyle: 'italic' }}>
                            Empty note
                          </Text>
                        )}
                        <Stack horizontal alignItems="center" gap={8} marginTop={2}>
                          <Text variant="caption" color={C.textMuted}>{wordCount} words</Text>
                          {note.synced && (
                            <Stack
                              backgroundColor={C.flashBg} borderRadius={6}
                              paddingHorizontal={7} paddingVertical={2}
                            >
                              <Text variant="caption" color={C.flashColor} fontWeight="600"
                                style={{ fontSize: 9 }}
                              >
                                ● AI ready
                              </Text>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>
                      <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
                    </Stack>
                  </StyledCard>
                </StyledPressable>
              )
            })}
          </Stack>
        )}
      </StyledScrollView>
    </StyledPage>
  )
}
