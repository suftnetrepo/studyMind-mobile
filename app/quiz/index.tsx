import React from 'react'
import { Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton, useToast,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { EmptyState } from '../../src/components/EmptyState'
import { RichText, preprocessMath } from '../../src/components/RichText'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useQuiz } from '../../src/hooks'
import { useIsFocused } from '@react-navigation/native'
import { takePendingQuiz } from '../../src/utils/quizBridge'
import { shareText } from '../../src/utils/share'

export default function QuizScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { activeModuleId, activeCourseCode, activeModuleTitle } = useModuleStore()


  const {
    phase, currentQuestion, currentIdx, totalQuestions,
    progress, answers, results, generating, submitting,
    answer, next, prev, submit, reset,
    history, historyLoaded, openAttempt, deleteAttempt, refreshHistory,
  } = useQuiz(activeModuleId)

  const toast = useToast()

  // Coming back from the create screen: open the quiz that was just made (and refresh the list).
  const isFocused = useIsFocused()
  React.useEffect(() => {
    if (!isFocused) return
    const id = takePendingQuiz()
    if (id) openAttempt({ id })
    else refreshHistory()
  }, [isFocused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Results screen: which question cards are expanded, and where each sits (for tap-to-jump)
  const [open, setOpen] = React.useState<Record<string, boolean>>({})
  const resultsScroll = React.useRef<ScrollView>(null)
  const cardY = React.useRef<Record<string, number>>({})
  React.useEffect(() => {
    if (phase !== 'results' || !results) return
    const firstWrong = results.questions.find((q: any) => !q.is_correct)
    setOpen(firstWrong ? { [firstWrong.id]: true } : {})
    cardY.current = {}
  }, [phase, results])

  // Elapsed timer + bookmarks for the question screen
  const [elapsed, setElapsed] = React.useState(0)
  const [bookmarks, setBookmarks] = React.useState<Record<string, boolean>>({})
  React.useEffect(() => {
    if (phase !== 'taking') return
    setElapsed(0)
    setBookmarks({})
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase])
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  const formatQuizResults = (results: any, courseCode: string, topic?: string) => {
    const lines = [
      `StudyMind AI — ${courseCode} Quiz Results`,
      topic ? `Topic: ${topic}` : '',
      `Score: ${Math.round(results.score)}% (${results.correct}/${results.total} correct)`,
      `Date: ${new Date().toLocaleString()}`,
      '─'.repeat(50),
      '',
    ]
    results.questions.forEach((q: any, i: number) => {
      lines.push(`Q${i + 1}: ${q.question}`)
      lines.push(`Your answer: ${q.student_answer || 'Not answered'}`)
      lines.push(`Correct: ${q.correct_answer} ${q.is_correct ? '✓' : '✗'}`)
      lines.push(`Explanation: ${q.explanation}`)
      lines.push('')
    })
    return lines.filter(Boolean).join('\n')
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (phase === 'list') {
    const ACCENTS = [
      { fg: C.chatColor,  bg: C.chatBg  },
      { fg: C.quizColor,  bg: C.quizBg  },
      { fg: C.flashColor, bg: C.flashBg },
      { fg: C.sumColor,   bg: C.sumBg   },
    ]
    const typeLabel = (t: string) => (t === 'true_false' ? 'True / false' : 'Multiple choice')
    const when = (iso: string) =>
      new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="Quizzes" onBackPress={() => router.back()} />

        {!activeModuleId ? (
          <Stack padding={20}>
            <EmptyState
              icon="help-circle"
              title="No module selected"
              subtitle="Open a module first, then create a quiz from its materials."
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

              {historyLoaded && history.length === 0 ? (
                <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={28}
                  alignItems="center" gap={10} style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack width={64} height={64} borderRadius={20} backgroundColor={C.quizBg}
                    alignItems="center" justifyContent="center"
                  >
                    <Feather name="help-circle" size={28} color={C.quizColor} />
                  </Stack>
                  <Text variant="subtitle" color={C.textPrimary} fontWeight="700">No quizzes yet</Text>
                  <Text variant="body" color={C.textSecondary} textAlign="center">
                    Tap the + button to create a quiz from this module's materials.
                  </Text>
                </StyledCard>
              ) : (
                <Stack gap={12}>
                  {history.map((item, i) => {
                    const acc  = ACCENTS[i % ACCENTS.length]
                    const done = item.status === 'submitted'
                    const pct  = Math.round(item.score ?? 0)
                    const scoreFg = pct >= 70 ? C.success : pct >= 50 ? C.warning : C.error
                    const scoreBg = pct >= 70 ? C.successBg : pct >= 50 ? C.warningBg : C.errorBg
                    const progress = item.question_count ? item.answered_count / item.question_count : 0
                    return (
                      <StyledPressable key={item.id} onPress={() => openAttempt(item)}>
                        <StyledCard backgroundColor={C.bgCard} borderRadius={18} padding={16}
                          style={{ borderWidth: 1, borderColor: C.border }}
                        >
                          <Stack horizontal alignItems="center" gap={14}>
                            <Stack width={48} height={48} borderRadius={14} backgroundColor={acc.bg}
                              alignItems="center" justifyContent="center"
                            >
                              <Feather name={done ? 'check-circle' : 'help-circle'} size={21} color={acc.fg} />
                            </Stack>
                            <Stack flex={1} gap={4}>
                              <Text variant="label" color={C.textPrimary} fontWeight="700" numberOfLines={1}>
                                {item.title}
                              </Text>
                              <Text variant="caption" color={C.textSecondary} numberOfLines={1}>
                                {typeLabel(item.question_type)} · {item.question_count} questions · {when(item.created_at)}
                              </Text>
                              {!done && (
                                <Stack horizontal alignItems="center" gap={8} marginTop={2}>
                                  <Stack flex={1} height={5} borderRadius={3} backgroundColor={C.bgMuted} style={{ overflow: 'hidden' }}>
                                    <Stack height={5} borderRadius={3} backgroundColor={acc.fg} width={`${Math.round(progress * 100)}%` as any} />
                                  </Stack>
                                  <Text variant="caption" color={C.textMuted} style={{ fontSize: 10 }}>
                                    {item.answered_count}/{item.question_count}
                                  </Text>
                                </Stack>
                              )}
                            </Stack>
                            <Stack alignItems="flex-end" gap={8}>
                              {done ? (
                                <Stack backgroundColor={scoreBg} borderRadius={10} paddingHorizontal={10} paddingVertical={4}>
                                  <Text variant="caption" color={scoreFg} fontWeight="800">{pct}%</Text>
                                </Stack>
                              ) : (
                                <Stack backgroundColor={acc.bg} borderRadius={10} paddingHorizontal={10} paddingVertical={4}>
                                  <Text variant="caption" color={acc.fg} fontWeight="700">
                                    {item.answered_count > 0 ? 'Continue' : 'Start'}
                                  </Text>
                                </Stack>
                              )}
                              <StyledPressable hitSlop={10} onPress={() => deleteAttempt(item)}>
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
              onPress={() => router.push('/quiz/create' as any)}
              width={58} height={58} borderRadius={29}
              backgroundColor={C.quizColor} alignItems="center" justifyContent="center"
              style={{
                position: 'absolute', right: 20, bottom: Platform.OS === 'ios' ? 34 : 22,
                shadowColor: C.quizColor, shadowOpacity: 0.4, shadowRadius: 12,
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

  // ── Taking quiz ───────────────────────────────────────────────────────────
  if (phase === 'taking' && currentQuestion) {
    const selected = answers[currentQuestion.id]
    const options  = currentQuestion.options ||
      [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }]
    const isLast   = currentIdx >= totalQuestions - 1
    const marked   = !!bookmarks[currentQuestion.id]

    // Theme accent colours; questions and answer letters each rotate through them.
    const ACCENTS = [
      { fg: C.chatColor,  bg: C.chatBg  },
      { fg: C.quizColor,  bg: C.quizBg  },
      { fg: C.flashColor, bg: C.flashBg },
      { fg: C.sumColor,   bg: C.sumBg   },
    ]
    const qAccent = ACCENTS[currentIdx % ACCENTS.length]

    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="Quiz" onBackPress={reset} />

        {/* Top bar: question number, chips, timer, bookmark */}
        <Stack horizontal alignItems="center" justifyContent="space-between"
          paddingHorizontal={20} paddingTop={6} paddingBottom={12}
        >
          <Stack horizontal alignItems="center" gap={8}>
            <Stack width={38} height={38} borderRadius={19} alignItems="center" justifyContent="center"
              backgroundColor={qAccent.bg} style={{ borderWidth: 1.5, borderColor: qAccent.fg }}
            >
              <Text variant="label" color={qAccent.fg} fontWeight="800">{currentIdx + 1}</Text>
            </Stack>
            <Stack backgroundColor={C.successBg} borderRadius={100} paddingHorizontal={12} paddingVertical={6}>
              <Text variant="caption" color={C.success} fontWeight="700">
                {currentIdx + 1} of {totalQuestions}
              </Text>
            </Stack>
            <Stack backgroundColor={C.bgMuted} borderRadius={100} paddingHorizontal={12} paddingVertical={6}>
              <Text variant="caption" color={C.textSecondary} fontWeight="700">
                {Object.keys(answers).length} answered
              </Text>
            </Stack>
          </Stack>
          <Stack horizontal alignItems="center" gap={14}>
            <Stack horizontal alignItems="center" gap={5}>
              <Feather name="clock" size={14} color={C.textSecondary} />
              <Text variant="label" color={C.textSecondary} fontWeight="700">{clock}</Text>
            </Stack>
            <StyledPressable
              hitSlop={10}
              onPress={() => setBookmarks((b) => ({ ...b, [currentQuestion.id]: !b[currentQuestion.id] }))}
            >
              <Feather name="bookmark" size={22} color={marked ? C.sumColor : C.textSecondary} />
            </StyledPressable>
          </Stack>
        </Stack>

        {/* Progress */}
        <Stack horizontal gap={4} paddingHorizontal={20} marginBottom={6}>
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <Stack key={i} flex={1} height={4} borderRadius={2}
              backgroundColor={i < currentIdx ? C.quizColor : i === currentIdx ? C.primary : C.bgMuted}
            />
          ))}
        </Stack>

        <StyledScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }}
        >
          {/* Question */}
          <Stack paddingHorizontal={20} marginBottom={22}>
            <RichText content={currentQuestion.question} fontSize={17} />
          </Stack>

          {/* Options: one grouped list */}
          <Stack backgroundColor={C.bgCard}
            style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border }}
          >
            {options.map((opt: any, i: number) => {
              const isSelected = selected === opt.id
              const acc = ACCENTS[i % ACCENTS.length]
              return (
                <StyledPressable key={opt.id} onPress={() => answer(currentQuestion.id, opt.id)}>
                  <Stack horizontal alignItems="center" gap={14}
                    paddingHorizontal={20} paddingVertical={16}
                    backgroundColor={isSelected ? acc.bg : 'transparent'}
                    style={i < options.length - 1 ? { borderBottomWidth: 1, borderBottomColor: C.border } : undefined}
                  >
                    <Stack width={34} height={34} borderRadius={17} alignItems="center" justifyContent="center"
                      backgroundColor={isSelected ? acc.fg : acc.bg}
                    >
                      <Text variant="label" fontWeight="800" color={isSelected ? C.white : acc.fg}>
                        {String(opt.id).toUpperCase()}
                      </Text>
                    </Stack>
                    <Text variant="body" fontWeight={isSelected ? '700' : '500'}
                      color={C.textPrimary} style={{ flex: 1, lineHeight: 22, fontSize: 16 }}
                    >
                      {preprocessMath(String(opt.text))}
                    </Text>
                    {isSelected && <Feather name="check-circle" size={20} color={acc.fg} />}
                  </Stack>
                </StyledPressable>
              )
            })}
          </Stack>
        </StyledScrollView>

        {/* Sticky navigation */}
        <Stack horizontal gap={12} paddingHorizontal={20} paddingTop={12}
          paddingBottom={Platform.OS === 'ios' ? 30 : 16} backgroundColor={C.bg}
        >
          <StyledButton
            backgroundColor={C.bgMuted} borderRadius={100} paddingVertical={16} flex={1}
            disabled={currentIdx === 0} onPress={prev} style={{ opacity: currentIdx === 0 ? 0.45 : 1 }}
          >
            <Text variant="button" color={C.textPrimary}>Previous</Text>
          </StyledButton>
          {isLast ? (
            <StyledButton
              backgroundColor={C.textPrimary} borderRadius={100} paddingVertical={16} flex={1}
              loading={submitting} onPress={submit}
            >
              <Text variant="button" color={C.bg}>Submit quiz</Text>
            </StyledButton>
          ) : (
            <StyledButton
              backgroundColor={C.textPrimary} borderRadius={100} paddingVertical={16} flex={1}
              disabled={!selected} onPress={next} style={{ opacity: selected ? 1 : 0.45 }}
            >
              <Text variant="button" color={C.bg}>Next</Text>
            </StyledButton>
          )}
        </Stack>
      </StyledPage>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (phase === 'results' && results) {
    const total    = results.total
    const correct  = results.correct
    const answered = results.questions.filter((q: any) => q.student_answer).length
    const pct      = Math.round(results.score)
    const band = pct >= 70
      ? { fg: C.success, bg: C.successBg, label: 'Excellent work',  icon: 'award'    as const }
      : pct >= 50
      ? { fg: C.warning, bg: C.warningBg, label: 'Good effort',     icon: 'thumbs-up' as const }
      : { fg: C.error,   bg: C.errorBg,   label: 'Keep practising', icon: 'book'      as const }
    const allOpen = results.questions.every((q: any) => open[q.id])

    const jumpTo = (id: string) => {
      setOpen((o) => ({ ...o, [id]: true }))
      setTimeout(() => {
        const y = cardY.current[id]
        if (y != null) resultsScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })
      }, 60)
    }

    const optionsFor = (q: any) =>
      q.options && q.options.length ? q.options : [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }]

    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="Quiz results" onBackPress={reset} />
        <ScrollView ref={resultsScroll} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        >
          {/* Summary */}
          <StyledCard backgroundColor={C.bgCard} borderRadius={24} padding={20} marginBottom={26}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <Stack horizontal alignItems="center" gap={8} marginBottom={16}>
              <Stack width={30} height={30} borderRadius={10} backgroundColor={band.bg} alignItems="center" justifyContent="center">
                <Feather name={band.icon} size={15} color={band.fg} />
              </Stack>
              <Text variant="label" color={band.fg} fontWeight="800">{band.label}</Text>
            </Stack>

            <Stack horizontal>
              {[
                { label: 'Score',     value: String(correct),  suffix: `/${total}`,        color: C.chatColor  },
                { label: 'Attempted', value: String(answered), suffix: `/${total}`,        color: C.success    },
                { label: 'Accuracy',  value: String(pct),      suffix: '%',                color: band.fg      },
              ].map((m, i) => (
                <Stack key={m.label} flex={1} paddingLeft={i > 0 ? 16 : 0}
                  style={i > 0 ? { borderLeftWidth: 1, borderLeftColor: C.border } : undefined}
                >
                  <Text variant="caption" color={C.textSecondary}>{m.label}</Text>
                  <Stack horizontal alignItems="flex-end" marginTop={4}>
                    <Text variant="title" color={m.color} fontWeight="800" style={{ fontSize: 28, lineHeight: 32 }}>{m.value}</Text>
                    <Text variant="body" color={C.textMuted} style={{ marginBottom: 3 }}>{m.suffix}</Text>
                  </Stack>
                </Stack>
              ))}
            </Stack>

            <Stack height={1} backgroundColor={C.border} marginVertical={18} />

            {/* One dot per question: tap to jump to its analysis */}
            <Stack horizontal style={{ flexWrap: 'wrap', gap: 10 }}>
              {results.questions.map((q: any, i: number) => (
                <StyledPressable key={q.id} onPress={() => jumpTo(q.id)} hitSlop={4}>
                  <Stack width={34} height={34} borderRadius={17} alignItems="center" justifyContent="center"
                    backgroundColor={q.is_correct ? C.successBg : C.errorBg}
                  >
                    <Feather name={q.is_correct ? 'check' : 'x'} size={15} color={q.is_correct ? C.success : C.error} />
                  </Stack>
                </StyledPressable>
              ))}
            </Stack>
            <Stack horizontal gap={16} marginTop={14}>
              <Stack horizontal alignItems="center" gap={6}>
                <Stack width={8} height={8} borderRadius={4} backgroundColor={C.success} />
                <Text variant="caption" color={C.textSecondary}>Correct</Text>
              </Stack>
              <Stack horizontal alignItems="center" gap={6}>
                <Stack width={8} height={8} borderRadius={4} backgroundColor={C.error} />
                <Text variant="caption" color={C.textSecondary}>Incorrect</Text>
              </Stack>
              <Text variant="caption" color={C.textMuted}>Tap a dot to jump</Text>
            </Stack>
          </StyledCard>

          {/* Detailed analysis */}
          <Stack horizontal alignItems="center" justifyContent="space-between" marginBottom={14}>
            <Text variant="subtitle" color={C.textPrimary} fontWeight="800">Detailed question analysis</Text>
            <StyledPressable hitSlop={8} onPress={() =>
              setOpen(allOpen ? {} : Object.fromEntries(results.questions.map((q: any) => [q.id, true])))
            }>
              <Text variant="bodySmall" color={C.primary} fontWeight="700">{allOpen ? 'Collapse all' : 'Expand all'}</Text>
            </StyledPressable>
          </Stack>

          <Stack gap={12}>
            {results.questions.map((q: any, i: number) => {
              const isOpen = !!open[q.id]
              const ok = !!q.is_correct
              return (
                <Stack key={q.id} onLayout={(e: any) => { cardY.current[q.id] = e.nativeEvent.layout.y }}>
                  <StyledCard backgroundColor={C.bgCard} borderRadius={18}
                    style={{ borderWidth: 1, borderColor: isOpen ? (ok ? `${C.success}55` : `${C.error}55`) : C.border, overflow: 'hidden' }}
                  >
                    <StyledPressable onPress={() => setOpen((o) => ({ ...o, [q.id]: !o[q.id] }))}>
                      <Stack horizontal alignItems="center" gap={12} padding={16}>
                        <Stack width={28} height={28} borderRadius={14} alignItems="center" justifyContent="center"
                          backgroundColor={ok ? C.successBg : C.errorBg}
                        >
                          <Feather name={ok ? 'check' : 'x'} size={14} color={ok ? C.success : C.error} />
                        </Stack>
                        <Stack flex={1}>
                          <Text variant="label" color={C.textPrimary} fontWeight="700">Question {i + 1}</Text>
                          {!isOpen && (
                            <Text variant="caption" color={C.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
                              {preprocessMath(q.question.replace(/[*_`#]/g, ''))}
                            </Text>
                          )}
                        </Stack>
                        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textMuted} />
                      </Stack>
                    </StyledPressable>

                    {isOpen && (
                      <Stack paddingHorizontal={16} paddingBottom={16} gap={14}>
                        <RichText content={q.question} fontSize={15} />

                        <Stack gap={8}>
                          {optionsFor(q).map((opt: any) => {
                            const isCorrect = opt.id === q.correct_answer
                            const isYours   = opt.id === q.student_answer
                            const wrongPick = isYours && !isCorrect
                            const fg = isCorrect ? C.success : wrongPick ? C.error : C.textSecondary
                            const bg = isCorrect ? C.successBg : wrongPick ? C.errorBg : C.bgMuted
                            return (
                              <Stack key={opt.id} horizontal alignItems="center" gap={12}
                                backgroundColor={isCorrect || wrongPick ? bg : 'transparent'}
                                borderRadius={12} padding={10}
                                style={{ borderWidth: 1, borderColor: isCorrect || wrongPick ? `${fg}40` : C.border }}
                              >
                                <Stack width={28} height={28} borderRadius={14} alignItems="center" justifyContent="center" backgroundColor={bg}>
                                  <Text variant="caption" color={fg} fontWeight="800">{String(opt.id).toUpperCase()}</Text>
                                </Stack>
                                <Text variant="body" color={C.textPrimary} style={{ flex: 1, lineHeight: 21 }}>
                                  {preprocessMath(String(opt.text))}
                                </Text>
                                {isCorrect && <Feather name="check-circle" size={18} color={C.success} />}
                                {wrongPick && (
                                  <Stack horizontal alignItems="center" gap={4}>
                                    <Feather name="x-circle" size={18} color={C.error} />
                                  </Stack>
                                )}
                              </Stack>
                            )
                          })}
                          {!q.student_answer && (
                            <Text variant="caption" color={C.textMuted}>You didn't answer this question.</Text>
                          )}
                        </Stack>

                        <Stack backgroundColor={C.quizBg} borderRadius={14} padding={14}
                          style={{ borderWidth: 1, borderColor: `${C.quizColor}25` }}
                        >
                          <Stack horizontal alignItems="center" gap={6} marginBottom={6}>
                            <Feather name="info" size={13} color={C.quizColor} />
                            <Text variant="caption" color={C.quizColor} fontWeight="800">Explanation</Text>
                          </Stack>
                          <RichText content={q.explanation} fontSize={13} />
                        </Stack>
                      </Stack>
                    )}
                  </StyledCard>
                </Stack>
              )
            })}
          </Stack>

          <Stack gap={10} marginTop={26}>
            <StyledButton
              backgroundColor={C.quizColor} borderRadius={16} paddingVertical={16} onPress={reset}
              style={{ shadowColor: C.quizColor, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
            >
              <Text variant="button" color={C.white}>Back to my quizzes</Text>
            </StyledButton>
            <StyledPressable
              onPress={() => shareText(formatQuizResults(results, activeCourseCode || 'Module'), 'studymind-quiz-results.txt', toast)}
              backgroundColor={C.bgCard} borderRadius={14} paddingVertical={14}
              alignItems="center" borderWidth={1} borderColor={C.border}
            >
              <Stack horizontal alignItems="center" gap={6}>
                <Feather name="share" size={15} color={C.textPrimary} />
                <Text variant="label" color={C.textPrimary}>Share results</Text>
              </Stack>
            </StyledPressable>
            <StyledButton backgroundColor={C.bgCard} borderRadius={16} paddingVertical={16}
              borderWidth={1} borderColor={C.border} onPress={() => router.back()}
            >
              <Text variant="button" color={C.textPrimary}>Back to module</Text>
            </StyledButton>
          </Stack>
        </ScrollView>
      </StyledPage>
    )
  }

  return null
}
