import React, { useCallback } from 'react'
import { Platform, TextInput } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable,
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

  type SortKey = 'recent' | 'oldest' | 'title' | 'unsynced'
  const [query, setQuery] = React.useState('')
  const [sort,  setSort]  = React.useState<SortKey>('recent')

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      : [...notes]
    list.sort((a, b) => {
      if (sort === 'oldest')   return a.updated_at.localeCompare(b.updated_at)
      if (sort === 'title')    return a.title.localeCompare(b.title)
      if (sort === 'unsynced') return Number(!!a.synced) - Number(!!b.synced) || b.updated_at.localeCompare(a.updated_at)
      return b.updated_at.localeCompare(a.updated_at)
    })
    return list
  }, [notes, query, sort])

  const openSort = () =>
    actionSheet.show({
      title: 'Sort notes',
      items: [
        { icon: '🕒', label: `${sort === 'recent'   ? '✓ ' : ''}Recently updated`, onPress: () => setSort('recent') },
        { icon: '📅', label: `${sort === 'oldest'   ? '✓ ' : ''}Oldest first`,      onPress: () => setSort('oldest') },
        { icon: '🔤', label: `${sort === 'title'    ? '✓ ' : ''}Title A to Z`,      onPress: () => setSort('title') },
        { icon: '⚠️', label: `${sort === 'unsynced' ? '✓ ' : ''}Not synced first`,  onPress: () => setSort('unsynced') },
      ],
    })

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
      {/* Header */}
      <Stack horizontal alignItems="center" justifyContent="space-between" paddingHorizontal={20} paddingTop={6} paddingBottom={14}>
        <Stack horizontal alignItems="center" gap={14} flex={1}>
          <StyledPressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
            width={backShape.size} height={backShape.size}
            borderRadius={backShape.size / 2}
            backgroundColor={backShape.backgroundColor}
            borderWidth={backShape.borderWidth} borderColor={backShape.borderColor}
            alignItems="center" justifyContent="center"
          >
            <Feather name="arrow-left" size={backArrow.size} color={backArrow.color} />
          </StyledPressable>
          <Stack flex={1}>
            <Text variant="title" color={C.textPrimary} fontWeight="800">Notes</Text>
            <Text variant="bodySmall" color={C.textSecondary}>Your thoughts, organised.</Text>
          </Stack>
        </Stack>
        <StyledPressable onPress={openSort} width={44} height={44} borderRadius={22}
          backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
        >
          <Feather name="sliders" size={18} color={C.textSecondary} />
        </StyledPressable>
      </Stack>

      {/* Search */}
      <Stack horizontal alignItems="center" gap={12} backgroundColor={C.bgMuted} borderRadius={18}
        marginHorizontal={20} paddingHorizontal={16} style={{ height: 50 }}
      >
        <Feather name="search" size={18} color={C.textMuted} />
        <TextInput
          value={query} onChangeText={setQuery}
          placeholder="Search notes…" placeholderTextColor={C.textMuted}
          returnKeyType="search" autoCorrect={false}
          style={{ flex: 1, color: C.textPrimary, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' }}
        />
        {query.length > 0 && (
          <StyledPressable hitSlop={10} onPress={() => setQuery('')}>
            <Feather name="x-circle" size={17} color={C.textMuted} />
          </StyledPressable>
        )}
      </Stack>

      <StyledScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
      >
        {notes.length === 0 ? (
          <Stack alignItems="center" padding={40} gap={14}>
            <Stack width={80} height={80} borderRadius={24} backgroundColor={C.primaryBg} alignItems="center" justifyContent="center">
              <Feather name="edit-3" size={34} color={C.primary} />
            </Stack>
            <Text variant="title" color={C.textPrimary} fontWeight="700" textAlign="center">No notes yet</Text>
            <Text variant="body" color={C.textSecondary} textAlign="center">
              Tap the + button to start taking notes.
              Once written, save them to AI so the tutor, quiz and flashcards can use them.
            </Text>
          </Stack>
        ) : visible.length === 0 ? (
          <Stack alignItems="center" padding={40} gap={10}>
            <Feather name="search" size={32} color={C.textMuted} />
            <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No matches</Text>
            <Text variant="body" color={C.textSecondary} textAlign="center">Nothing found for "{query}".</Text>
          </Stack>
        ) : (
          <Stack gap={14}>
            {visible.map((note) => {
              const synced    = !!note.synced
              const tint      = synced ? { fg: C.flashColor, bg: C.flashBg } : { fg: C.sumColor, bg: C.sumBg }
              const body      = note.content.split('\n').slice(1).join(' ').replace(/\s+/g, ' ').trim() || note.content.replace(/\s+/g, ' ').trim()
              const preview   = body.length > 140 ? `${body.slice(0, 140).trimEnd()}…` : body
              const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0
              const date      = new Date(note.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

              return (
                <StyledPressable key={note.id} onPress={() => handleNotePress(note)} onLongPress={() => handleNoteLongPress(note)}>
                  <Stack
                    backgroundColor={tint.bg} borderRadius={24} padding={18} gap={8}
                    style={{
                      overflow: 'hidden', borderWidth: 1, borderColor: `${tint.fg}1F`,
                      shadowColor: tint.fg, shadowOpacity: 0.1, shadowRadius: 14,
                      shadowOffset: { width: 0, height: 6 }, elevation: 3,
                    }}
                  >
                    {/* Decorative hill in the corner */}
                    <Stack pointerEvents="none" style={{ position: 'absolute', right: 0, bottom: 0 }}>
                      <Svg width={150} height={62} viewBox="0 0 150 62">
                        <Path d="M0 62 C40 60 60 10 110 5 C130 3 145 12 150 18 L150 62 Z" fill={tint.fg} fillOpacity={0.14} />
                      </Svg>
                    </Stack>

                    <Stack horizontal alignItems="center" gap={12}>
                      <Stack width={26} height={26} borderRadius={13} alignItems="center" justifyContent="center"
                        backgroundColor={`${tint.fg}26`}
                      >
                        <Stack width={11} height={11} borderRadius={6} backgroundColor={tint.fg} />
                      </Stack>
                      <Text variant="subtitle" color={C.textPrimary} fontWeight="800" numberOfLines={1} style={{ flex: 1 }}>
                        {note.title}
                      </Text>
                      <Text variant="caption" color={C.textSecondary}>{date}</Text>
                      <StyledPressable hitSlop={10} onPress={() => handleNoteLongPress(note)}>
                        <Feather name="more-horizontal" size={20} color={C.textSecondary} />
                      </StyledPressable>
                    </Stack>

                    {preview ? (
                      <Text variant="body" color={C.textSecondary} numberOfLines={2} style={{ lineHeight: 22 }}>{preview}</Text>
                    ) : (
                      <Text variant="body" color={C.textMuted}>Empty note</Text>
                    )}

                    <Stack horizontal alignItems="center" gap={10} marginTop={4}>
                      <Text variant="caption" color={C.textSecondary}>{wordCount} words</Text>
                      {synced && (
                        <Stack horizontal alignItems="center" gap={6} backgroundColor={`${tint.fg}22`}
                          borderRadius={100} paddingHorizontal={10} paddingVertical={5}
                        >
                          <Stack width={7} height={7} borderRadius={4} backgroundColor={tint.fg} />
                          <Text variant="caption" color={tint.fg} fontWeight="700">AI ready</Text>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </StyledPressable>
              )
            })}
          </Stack>
        )}
      </StyledScrollView>

      {/* New note */}
      <StyledPressable
        onPress={handleNewNote}
        width={58} height={58} borderRadius={29}
        backgroundColor={C.primary} alignItems="center" justifyContent="center"
        style={{
          position: 'absolute', right: 20, bottom: Platform.OS === 'ios' ? 34 : 22,
          shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 }, elevation: 8,
        }}
      >
        <Feather name="plus" size={26} color={C.white} />
      </StyledPressable>
    </StyledPage>
  )
}
