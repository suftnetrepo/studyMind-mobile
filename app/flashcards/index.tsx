import React from 'react'
import { Platform, TextInput } from 'react-native'
import { router } from 'expo-router'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { EmptyState } from '../../src/components/EmptyState'
import { RichText } from '../../src/components/RichText'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useFlashcards } from '../../src/hooks'

const CARD_COUNTS = [10, 15, 20, 30] as const

export default function FlashcardsScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { activeModuleId, activeCourseCode, activeModuleTitle } = useModuleStore()

  const [maxCards, setMaxCards] = React.useState(20)
  const [topic,    setTopic]    = React.useState('')

  const {
    deck, decks, cardIdx, flipped, currentCard,
    masteredCount, totalCards, progressPct,
    generating, updating,
    generate, flip, updateCard, openDeck, closeDeck,
  } = useFlashcards(activeModuleId)

  // ── Deck picker / generate ─────────────────────────────────────────────────
  if (!deck) {
    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="Flashcards" subtitle="Review key terms" onBackPress={() => router.back()} />
        <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

          {!activeModuleId ? (
            <EmptyState
              emoji="🃏"
              title="No module selected"
              subtitle="Open a module first, then generate flashcards from its materials."
              action={{ label: 'Browse modules', onPress: () => router.push('/(tabs)/modules' as any) }}
            />
          ) : (
            <>
              {/* Module banner */}
              <StyledCard backgroundColor={C.flashBg} borderRadius={18} padding={16} marginBottom={24}
                style={{ borderWidth: 1, borderColor: `${C.flashColor}30` }}
              >
                <Stack horizontal alignItems="center" gap={12}>
                  <Stack
                    width={46} height={46} borderRadius={13}
                    backgroundColor={`${C.flashColor}20`} alignItems="center" justifyContent="center"
                  >
                    <Text style={{ fontSize: 22 }}>🃏</Text>
                  </Stack>
                  <Stack flex={1}>
                    <Text variant="overline" color={C.flashColor}>Generating from</Text>
                    <Text variant="label" color={C.textPrimary} fontWeight="700" numberOfLines={1}>
                      {activeCourseCode} — {activeModuleTitle}
                    </Text>
                  </Stack>
                </Stack>
              </StyledCard>

              {/* Card count */}
              <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>
                Number of cards
              </Text>
              <Stack horizontal gap={8} marginBottom={24}>
                {CARD_COUNTS.map((n) => (
                  <StyledPressable
                    key={n} flex={1}
                    backgroundColor={maxCards === n ? C.flashColor : C.bgCard}
                    borderRadius={12} paddingVertical={13}
                    borderWidth={1.5} borderColor={maxCards === n ? C.flashColor : C.border}
                    alignItems="center" onPress={() => setMaxCards(n)}
                    style={maxCards === n ? {
                      shadowColor: C.flashColor, shadowOpacity: 0.3,
                      shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
                    } : undefined}
                  >
                    <Text variant="title"
                      color={maxCards === n ? C.white : C.textSecondary}
                      fontWeight="800" style={{ fontSize: 18 }}
                    >{n}</Text>
                  </StyledPressable>
                ))}
              </Stack>

              {/* Previous decks */}
              {decks.length > 0 && (
                <>
                  <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>
                    Previous decks
                  </Text>
                  <Stack gap={8} marginBottom={24}>
                    {decks.map((d: any) => (
                      <StyledPressable key={d.id} onPress={() => openDeck(d.id)}>
                        <StyledCard backgroundColor={C.bgCard} borderRadius={14} padding={14}
                          style={{ borderWidth: 1, borderColor: C.border }}
                        >
                          <Stack horizontal alignItems="center" gap={12}>
                            <Stack
                              width={40} height={40} borderRadius={11}
                              backgroundColor={C.flashBg} alignItems="center" justifyContent="center"
                            >
                              <Text style={{ fontSize: 18 }}>🃏</Text>
                            </Stack>
                            <Stack flex={1} gap={4}>
                              <Text variant="label" color={C.textPrimary} fontWeight="600"
                                numberOfLines={1}
                              >{d.title}</Text>
                              <Stack horizontal gap={8} alignItems="center">
                                <Text variant="caption" color={C.textSecondary}>
                                  {d.card_count} cards
                                </Text>
                                <Stack width={3} height={3} borderRadius={2} backgroundColor={C.border} />
                                <Text variant="caption" color={C.flashColor} fontWeight="600">
                                  {d.mastered_count}/{d.card_count} mastered
                                </Text>
                              </Stack>
                              {/* Mini progress bar */}
                              <Stack height={3} backgroundColor={C.bgMuted} borderRadius={2}
                                style={{ overflow: 'hidden' }}
                              >
                                <Stack
                                  height={3} borderRadius={2} backgroundColor={C.flashColor}
                                  width={`${d.card_count ? Math.round((d.mastered_count / d.card_count) * 100) : 0}%` as any}
                                />
                              </Stack>
                            </Stack>
                            <Text style={{ fontSize: 16, color: C.textMuted }}>›</Text>
                          </Stack>
                        </StyledCard>
                      </StyledPressable>
                    ))}
                  </Stack>
                </>
              )}

              {/* Topic */}
              <Stack gap={8} marginBottom={24}>
                <Text variant="label" color={C.textPrimary} fontWeight="700">
                  Topic (optional)
                </Text>
                <Stack
                  backgroundColor={C.bgInput} borderRadius={14}
                  borderWidth={1} borderColor={C.border}
                  paddingHorizontal={16} paddingVertical={12}
                >
                  <TextInput
                    value={topic}
                    onChangeText={setTopic}
                    placeholder="e.g. Python data types, React Native hooks, TypeScript generics"
                    placeholderTextColor={C.textMuted}
                    style={{
                      color:      C.textPrimary,
                      fontSize:   14,
                      fontFamily: 'PlusJakartaSans_400Regular',
                    }}
                  />
                </Stack>
                <Text variant="caption" color={C.textSecondary}>
                  Leave blank to cover all topics in this module
                </Text>
              </Stack>

              <StyledButton
                backgroundColor={C.flashColor} borderRadius={16} paddingVertical={17}
                loading={generating} onPress={() => generate(maxCards, topic || undefined)}
                style={{
                  shadowColor: C.flashColor, shadowOpacity: 0.4,
                  shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
                }}
              >
                <Text variant="button" color={C.white}>
                  {generating ? 'Generating cards…' : `Generate ${maxCards} flashcards`}
                </Text>
              </StyledButton>
            </>
          )}
        </StyledScrollView>
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
        title={deck.title}
        subtitle={`${activeCourseCode || ''} · Card ${cardIdx + 1} of ${totalCards}`}
        onBackPress={closeDeck}
        rightIcon={
          <Stack
            backgroundColor={C.flashBg} borderRadius={10}
            paddingHorizontal={10} paddingVertical={5}
          >
            <Text variant="caption" color={C.flashColor} fontWeight="700">
              {masteredCount}/{totalCards} ✓
            </Text>
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

        {/* The card — tap to flip */}
        <StyledPressable onPress={flip}>
          <Stack
            backgroundColor={C.bgCard} borderRadius={24}
            borderWidth={1} borderColor={C.border}
            padding={32} marginBottom={16}
            alignItems="center" justifyContent="center"
            style={{
              minHeight: 220,
              shadowColor: '#000', shadowOpacity: 0.06,
              shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
            }}
          >
            {/* Card type label */}
            <Stack
              backgroundColor={flipped ? C.quizBg : C.flashBg}
              borderRadius={10} paddingHorizontal={12} paddingVertical={5}
              marginBottom={20}
            >
              <Text
                variant="overline"
                color={flipped ? C.quizColor : C.flashColor}
                style={{ fontSize: 10 }}
              >
                {flipped ? 'DEFINITION' : 'TERM'}
              </Text>
            </Stack>

            {flipped ? (
              <Stack style={{ width: '100%', marginBottom: 16 }}>
                <RichText content={currentCard?.back || ''} fontSize={13} />
              </Stack>
            ) : (
              <Text
                variant="title"
                color={C.textPrimary}
                fontWeight="700"
                textAlign="center"
                style={{ lineHeight: 30, marginBottom: 16 }}
              >
                {currentCard?.front}
              </Text>
            )}

            <Stack horizontal alignItems="center" gap={6}>
              <Stack
                width={5} height={5} borderRadius={3}
                backgroundColor={C.textMuted}
              />
              <Text variant="caption" color={C.textMuted}>
                {flipped ? 'Tap to see term' : 'Tap to reveal definition'}
              </Text>
            </Stack>
          </Stack>
        </StyledPressable>

        {/* Source quote — shows when flipped */}
        {flipped && currentCard?.source_chunk && (
          <StyledCard
            backgroundColor={C.flashBg} borderRadius={14} padding={14} marginBottom={16}
            style={{ borderWidth: 1, borderColor: `${C.flashColor}30` }}
          >
            <Stack horizontal gap={8} alignItems="flex-start">
              <Text style={{ fontSize: 14, marginTop: 1 }}>📄</Text>
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
            onPress={() => { /* go back handled in hook */ }}
            disabled={cardIdx === 0}
            style={{ opacity: cardIdx === 0 ? 0.4 : 1 }}
          >
            <Text variant="label" color={C.textPrimary}>← Back</Text>
          </StyledPressable>

          <StyledPressable
            flex={1.4}
            backgroundColor={C.errorBg}
            borderRadius={14} paddingVertical={14}
            alignItems="center"
            borderWidth={1} borderColor={`${C.error}30`}
            onPress={() => updateCard('learning')}
            disabled={updating}
          >
            <Text variant="label" color={C.error} fontWeight="700">Still learning</Text>
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
            <Text variant="label" color={C.flashColor} fontWeight="700">Mastered ✓</Text>
          </StyledPressable>
        </Stack>

        {/* Overall progress card */}
        <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={18}
          style={{ borderWidth: 1, borderColor: C.border }}
        >
          <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={10}>
            <Text variant="label" color={C.textPrimary} fontWeight="700">Deck progress</Text>
            <Text variant="label" color={C.flashColor} fontWeight="800">{progressPct}%</Text>
          </Stack>
          <Stack height={6} backgroundColor={C.bgMuted} borderRadius={3}
            style={{ overflow: 'hidden' }}
          >
            <Stack
              height={6} borderRadius={3} backgroundColor={C.flashColor}
              width={`${progressPct}%` as any}
              style={{
                shadowColor: C.flashColor, shadowOpacity: 0.3,
                shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
              }}
            />
          </Stack>
          <Stack horizontal justifyContent="space-between" marginTop={8}>
            <Text variant="caption" color={C.textSecondary}>
              {masteredCount} mastered
            </Text>
            <Text variant="caption" color={C.textSecondary}>
              {totalCards - masteredCount} remaining
            </Text>
          </Stack>
        </StyledCard>

      </StyledScrollView>
    </StyledPage>
  )
}
