import React from 'react'
import { Platform, TextInput, Animated, Easing, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { EmptyState } from '../../src/components/EmptyState'
import { RichText } from '../../src/components/RichText'
import { FontSizeButton } from '../../src/components/FontSizeButton'
import { FontSizePopup } from '../../src/components/FontSizePopup'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useFlashcards } from '../../src/hooks'
import { useIsFocused } from '@react-navigation/native'
import { takePendingDeck } from '../../src/utils/deckBridge'

// Untitled decks default to "Flashcards — N cards" server-side — redundant
// once we're already inside the Flashcards section, so strip it for display.
const deckDisplayTitle = (title: string) => title.replace(/^Flashcards\s*[—-]\s*/i, '')

export default function FlashcardsScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { activeModuleId, activeCourseCode, activeModuleTitle } = useModuleStore()


  const {
    deck, decks, cardIdx, flipped, currentCard,
    masteredCount, totalCards, progressPct,
    generating, updating, decksLoaded, refreshDecks,
    flip, prevCard, nextCard, updateCard, openDeck, closeDeck, deleteDeck,
  } = useFlashcards(activeModuleId)
  const [fontSizeOpen, setFontSizeOpen] = React.useState(false)

  // Back from the create screen: open the deck that was just made, otherwise refresh the list.
  const isFocused = useIsFocused()
  React.useEffect(() => {
    if (!isFocused || deck) return
    const id = takePendingDeck()
    if (id) openDeck(id)
    else refreshDecks()
  }, [isFocused]) // eslint-disable-line react-hooks/exhaustive-deps

  // 3D flip: 0 = term side, 1 = definition side. Jump back instantly when the card changes so the
  // next card's definition is never seen mid-flip.
  const flipAnim = React.useRef(new Animated.Value(0)).current
  React.useEffect(() => { flipAnim.setValue(0) }, [cardIdx, deck?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    Animated.timing(flipAnim, { toValue: flipped ? 1 : 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  }, [flipped]) // eslint-disable-line react-hooks/exhaustive-deps
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })

  // ── Deck picker / generate ─────────────────────────────────────────────────
  if (!deck) {
    const ACCENTS = [
      { fg: C.flashColor, bg: C.flashBg },
      { fg: C.chatColor,  bg: C.chatBg  },
      { fg: C.quizColor,  bg: C.quizBg  },
      { fg: C.sumColor,   bg: C.sumBg   },
    ]
    const when = (iso: string) =>
      iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''

    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="Flashcards" onBackPress={() => router.back()} />

        {!activeModuleId ? (
          <Stack padding={20}>
            <EmptyState
              icon="credit-card"
              title="No module selected"
              subtitle="Open a module first, then create flashcards from its materials."
              action={{ label: 'Browse modules', onPress: () => router.push('/(tabs)/modules' as any) }}
            />
          </Stack>
        ) : (
          <>
            <StyledScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
            >
              <Text variant="caption" color={C.textSecondary} style={{ marginBottom: 14 }}>
                {activeCourseCode ? `${activeCourseCode} · ` : ''}{activeModuleTitle}
              </Text>

              {decksLoaded && decks.length === 0 ? (
                <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={28}
                  alignItems="center" gap={10} style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack width={64} height={64} borderRadius={20} backgroundColor={C.flashBg} alignItems="center" justifyContent="center">
                    <Feather name="credit-card" size={28} color={C.flashColor} />
                  </Stack>
                  <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No flashcards yet</Text>
                  <Text variant="body" color={C.textSecondary} textAlign="center">
                    Tap the + button to create a deck from this module's materials.
                  </Text>
                </StyledCard>
              ) : (
                <Stack gap={12}>
                  {decks.map((d: any, i: number) => {
                    const acc  = ACCENTS[i % ACCENTS.length]
                    const pct  = d.card_count ? Math.round((d.mastered_count / d.card_count) * 100) : 0
                    const done = d.card_count > 0 && d.mastered_count >= d.card_count
                    return (
                      <StyledPressable key={d.id} onPress={() => openDeck(d.id)}>
                        <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={16}
                          style={{ borderWidth: 1, borderColor: C.border }}
                        >
                          <Stack horizontal alignItems="center" gap={14}>
                            <Stack width={48} height={48} borderRadius={14} backgroundColor={acc.bg} alignItems="center" justifyContent="center">
                              <Feather name={done ? 'check-circle' : 'credit-card'} size={21} color={acc.fg} />
                            </Stack>
                            <Stack flex={1} gap={4}>
                              <Text variant="label" color={C.textPrimary} fontWeight="700" numberOfLines={1}>{deckDisplayTitle(d.title)}</Text>
                              <Text variant="caption" color={C.textSecondary} numberOfLines={1}>
                                {d.card_count} cards · {d.mastered_count} mastered{d.created_at ? ` · ${when(d.created_at)}` : ''}
                              </Text>
                              <Stack horizontal alignItems="center" gap={8} marginTop={2}>
                                <Stack flex={1} height={5} borderRadius={3} backgroundColor={C.bgMuted} style={{ overflow: 'hidden' }}>
                                  <Stack height={5} borderRadius={3} backgroundColor={acc.fg} width={`${pct}%` as any} />
                                </Stack>
                                <Text variant="caption" color={C.textMuted} style={{ fontSize: 10 }}>{pct}%</Text>
                              </Stack>
                            </Stack>
                            <Stack alignItems="flex-end" gap={8}>
                              <Stack backgroundColor={acc.bg} borderRadius={10} paddingHorizontal={10} paddingVertical={4}>
                                <Text variant="caption" color={acc.fg} fontWeight="700">
                                  {done ? 'Review' : d.mastered_count > 0 ? 'Continue' : 'Study'}
                                </Text>
                              </Stack>
                              <StyledPressable hitSlop={10} onPress={() => deleteDeck(d)}>
                                <Feather name="trash-2" size={16} color={C.textMuted} />
                              </StyledPressable>
                            </Stack>
                          </Stack>
                        </StyledCard>
                      </StyledPressable>
                    )
                  })}
                </Stack>
              )}
            </StyledScrollView>

            {/* Create button */}
            <StyledPressable
              onPress={() => router.push('/flashcards/create' as any)}
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
          </>
        )}
      </StyledPage>
    )
  }

  // ── Card review ────────────────────────────────────────────────────────────
  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader
        title={deckDisplayTitle(deck.title)}
        subtitle={`${activeCourseCode || ''} · Card ${cardIdx + 1} of ${totalCards}`}
        onBackPress={closeDeck}
        rightIcon={
          <Stack horizontal alignItems="center" gap={8}>
            <FontSizeButton onPress={() => setFontSizeOpen(true)} />
            <Stack
              horizontal alignItems="center" gap={4}
              backgroundColor={C.flashBg} borderRadius={10}
              paddingHorizontal={10} paddingVertical={5}
            >
              <Text variant="caption" color={C.flashColor} fontWeight="700">
                {masteredCount}/{totalCards}
              </Text>
              <Feather name="check" size={11} color={C.flashColor} />
            </Stack>
          </Stack>
        }
      />

      <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

        {/* Progress dots */}
        <Stack horizontal gap={4} marginBottom={24}>
          {deck.cards.map((_: any, i: number) => (
            <Stack
              key={i} flex={1} height={4} borderRadius={2}
              backgroundColor={
                deck.cards[i]?.status === 'mastered' ? C.flashColor :
                i === cardIdx                         ? C.primary    : C.bgMuted
              }
            />
          ))}
        </Stack>

        {/* The card: tap to flip */}
        <StyledPressable onPress={flip}>
          <Stack style={{ height: 300, marginBottom: 16 }}>
            {/* Term side */}
            <Animated.View
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backfaceVisibility: 'hidden',
                transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
              }}
            >
              <Stack
                flex={1} backgroundColor={C.bgCard} borderRadius={24}
                borderWidth={1} borderColor={C.border} padding={28}
                alignItems="center" justifyContent="center"
                style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
              >
                <Stack backgroundColor={C.flashBg} borderRadius={10} paddingHorizontal={12} paddingVertical={5} marginBottom={20}>
                  <Text variant="overline" color={C.flashColor} style={{ fontSize: 10 }}>TERM</Text>
                </Stack>
                <Text variant="title" color={C.textPrimary} fontWeight="700" textAlign="center" style={{ lineHeight: 30, marginBottom: 16 }}>
                  {currentCard?.front}
                </Text>
                <Stack horizontal alignItems="center" gap={6}>
                  <Stack width={5} height={5} borderRadius={3} backgroundColor={C.textMuted} />
                  <Text variant="caption" color={C.textMuted}>Tap to reveal definition</Text>
                </Stack>
              </Stack>
            </Animated.View>

            {/* Definition side */}
            <Animated.View
              pointerEvents={flipped ? 'auto' : 'none'}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backfaceVisibility: 'hidden',
                transform: [{ perspective: 1200 }, { rotateY: backRotate }],
              }}
            >
              <Stack
                flex={1} backgroundColor={C.bgCard} borderRadius={24}
                borderWidth={1} borderColor={C.border} padding={24}
                style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
              >
                <Stack alignItems="center" marginBottom={12}>
                  <Stack backgroundColor={C.quizBg} borderRadius={10} paddingHorizontal={12} paddingVertical={5}>
                    <Text variant="overline" color={C.quizColor} style={{ fontSize: 10 }}>DEFINITION</Text>
                  </Stack>
                </Stack>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                  <RichText content={currentCard?.back || ''} fontSize={14} />
                </ScrollView>
                <Stack horizontal alignItems="center" justifyContent="center" gap={6} marginTop={10}>
                  <Stack width={5} height={5} borderRadius={3} backgroundColor={C.textMuted} />
                  <Text variant="caption" color={C.textMuted}>Tap to see term</Text>
                </Stack>
              </Stack>
            </Animated.View>
          </Stack>
        </StyledPressable>

        {/* Source quote — shows when flipped */}
        {flipped && currentCard?.source_chunk && (
          <StyledCard
            backgroundColor={C.flashBg} borderRadius={14} padding={14} marginBottom={16}
            style={{ borderWidth: 1, borderColor: `${C.flashColor}30` }}
          >
            <Stack horizontal gap={8} alignItems="flex-start">
              <Feather name="file-text" size={14} color={C.flashColor} style={{ marginTop: 1 }} />
              <Stack flex={1} gap={3}>
                <Text variant="caption" color={C.flashColor} fontWeight="700">Source</Text>
                <Text variant="caption" color={C.textSecondary} style={{ lineHeight: 18, fontStyle: 'italic' }}>
                  "{currentCard.source_chunk}"
                </Text>
              </Stack>
            </Stack>
          </StyledCard>
        )}

        {/* Action buttons */}
        <Stack horizontal gap={8} marginBottom={20}>
          <StyledPressable
            flex={1}
            backgroundColor={C.bgCard}
            borderRadius={14} paddingVertical={14}
            alignItems="center"
            borderWidth={1} borderColor={C.border}
            onPress={prevCard}
            disabled={cardIdx === 0}
            style={{ opacity: cardIdx === 0 ? 0.4 : 1 }}
          >
            <Stack horizontal alignItems="center" gap={5}>
              <Feather name="chevron-left" size={15} color={C.textPrimary} />
              <Text variant="label" color={C.textPrimary}>Previous</Text>
            </Stack>
          </StyledPressable>

          <StyledPressable
            flex={1}
            backgroundColor={C.bgCard}
            borderRadius={14} paddingVertical={14}
            alignItems="center"
            borderWidth={1} borderColor={C.border}
            onPress={nextCard}
            disabled={cardIdx === totalCards - 1}
            style={{ opacity: cardIdx === totalCards - 1 ? 0.4 : 1 }}
          >
            <Stack horizontal alignItems="center" gap={5}>
              <Text variant="label" color={C.textPrimary}>Next</Text>
              <Feather name="chevron-right" size={15} color={C.textPrimary} />
            </Stack>
          </StyledPressable>

          <StyledPressable
            flex={1.4}
            backgroundColor={C.flashBg}
            borderRadius={14} paddingVertical={14}
            alignItems="center"
            borderWidth={1} borderColor={`${C.flashColor}30`}
            onPress={() => updateCard('mastered')}
            disabled={updating}
            style={!updating ? {
              shadowColor: C.flashColor, shadowOpacity: 0.2,
              shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
            } : undefined}
          >
            <Stack horizontal alignItems="center" gap={5}>
              <Text variant="label" color={C.flashColor} fontWeight="700">Mastered</Text>
              <Feather name="check" size={14} color={C.flashColor} />
            </Stack>
          </StyledPressable>
        </Stack>

      </StyledScrollView>
      <FontSizePopup visible={fontSizeOpen} onClose={() => setFontSizeOpen(false)} />
    </StyledPage>
  )
}
