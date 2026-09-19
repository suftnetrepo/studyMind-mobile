import React from 'react'
import { Platform, TextInput } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton, useToast,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { EmptyState } from '../../src/components/EmptyState'
import { RichText } from '../../src/components/RichText'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useQuiz, type QType } from '../../src/hooks'
import { shareText } from '../../src/utils/share'

const Q_COUNTS   = [5, 10, 15, 20] as const
const Q_TYPES: { key: QType; label: string; icon: keyof typeof Feather.glyphMap; desc: string }[] = [
  { key: 'mcq',        label: 'Multiple choice', icon: 'list',         desc: '4 options per question' },
  { key: 'true_false', label: 'True / false',    icon: 'toggle-left',  desc: 'Quick binary questions' },
]

export default function QuizScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { activeModuleId, activeCourseCode, activeModuleTitle } = useModuleStore()

  const [qCount, setQCount] = React.useState(5)
  const [qType,  setQType]  = React.useState<QType>('mcq')
  const [topic,  setTopic]  = React.useState('')

  const {
    phase, currentQuestion, currentIdx, totalQuestions,
    progress, answers, results, generating, submitting,
    generate, answer, next, prev, submit, reset,
  } = useQuiz(activeModuleId)

  const toast = useToast()

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
  if (phase === 'setup') {
    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="AI Quiz" subtitle="Test your knowledge" onBackPress={() => router.back()} />
        <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

          {!activeModuleId ? (
            <EmptyState
              icon="help-circle"
              title="No module selected"
              subtitle="Open a module first, then generate a quiz from its materials."
              action={{ label: 'Browse modules', onPress: () => router.push('/(tabs)/modules' as any) }}
            />
          ) : (
            <>
              {/* Module banner */}
              <StyledCard backgroundColor={C.quizBg} borderRadius={18} padding={16} marginBottom={24}
                style={{ borderWidth: 1, borderColor: `${C.quizColor}30` }}
              >
                <Stack horizontal alignItems="center" gap={12}>
                  <Stack
                    width={46} height={46} borderRadius={13}
                    backgroundColor={`${C.quizColor}20`} alignItems="center" justifyContent="center"
                  >
                    <Feather name="help-circle" size={20} color={C.quizColor} />
                  </Stack>
                  <Stack flex={1}>
                    <Text variant="overline" color={C.quizColor}>Generating from</Text>
                    <Text variant="label" color={C.textPrimary} fontWeight="700" numberOfLines={1}>
                      {activeCourseCode} — {activeModuleTitle}
                    </Text>
                  </Stack>
                </Stack>
              </StyledCard>

              {/* Question count */}
              <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>
                Number of questions
              </Text>
              <Stack horizontal gap={8} marginBottom={24}>
                {Q_COUNTS.map((n) => (
                  <StyledPressable
                    key={n} flex={1}
                    backgroundColor={qCount === n ? C.quizColor : C.bgCard}
                    borderRadius={12} paddingVertical={13}
                    borderWidth={1.5}
                    borderColor={qCount === n ? C.quizColor : C.border}
                    alignItems="center" onPress={() => setQCount(n)}
                    style={qCount === n ? {
                      shadowColor: C.quizColor, shadowOpacity: 0.3,
                      shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
                    } : undefined}
                  >
                    <Text variant="title"
                      color={qCount === n ? C.white : C.textSecondary}
                      fontWeight="800"
                      style={{ fontSize: 18 }}
                    >{n}</Text>
                  </StyledPressable>
                ))}
              </Stack>

              {/* Question type */}
              <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>
                Question type
              </Text>
              <Stack gap={10} marginBottom={32}>
                {Q_TYPES.map(({ key, label, icon, desc }) => (
                  <StyledPressable
                    key={key}
                    backgroundColor={qType === key ? C.quizBg : C.bgCard}
                    borderRadius={16} padding={16}
                    borderWidth={1.5} borderColor={qType === key ? C.quizColor : C.border}
                    horizontal alignItems="center" gap={14}
                    onPress={() => setQType(key)}
                  >
                    <Stack
                      width={46} height={46} borderRadius={13}
                      backgroundColor={qType === key ? `${C.quizColor}20` : C.bgMuted}
                      alignItems="center" justifyContent="center"
                    >
                      <Feather name={icon} size={18} color={qType === key ? C.quizColor : C.textSecondary} />
                    </Stack>
                    <Stack flex={1} gap={2}>
                      <Text variant="label"
                        color={qType === key ? C.quizColor : C.textPrimary}
                        fontWeight={qType === key ? '700' : '500'}
                      >{label}</Text>
                      <Text variant="caption" color={C.textSecondary}>{desc}</Text>
                    </Stack>
                    {qType === key && (
                      <Stack
                        width={24} height={24} borderRadius={12}
                        backgroundColor={C.quizColor} alignItems="center" justifyContent="center"
                      >
                        <Feather name="check" size={13} color={C.white} />
                      </Stack>
                    )}
                  </StyledPressable>
                ))}
              </Stack>

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
                backgroundColor={C.quizColor} borderRadius={16} paddingVertical={17}
                loading={generating} onPress={() => generate(qCount, qType, topic || undefined)}
                style={{
                  shadowColor: C.quizColor, shadowOpacity: 0.4,
                  shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
                }}
              >
                <Text variant="button" color={C.white}>
                  {generating ? 'Generating quiz…' : `Generate ${qCount} questions`}
                </Text>
              </StyledButton>
            </>
          )}
        </StyledScrollView>
      </StyledPage>
    )
  }

  // ── Taking quiz ───────────────────────────────────────────────────────────
  if (phase === 'taking' && currentQuestion) {
    const selected = answers[currentQuestion.id]
    const options  = currentQuestion.options ||
      [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }]

    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader
          title="AI Quiz"
          subtitle={`${activeCourseCode || ''} · Question ${currentIdx + 1} of ${totalQuestions}`}
          onBackPress={reset}
        />
        <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

          {/* Progress */}
          <Stack gap={8} marginBottom={28}>
            {/* Dot indicators */}
            <Stack horizontal gap={4}>
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <Stack
                  key={i} flex={1} height={4} borderRadius={2}
                  backgroundColor={
                    i < currentIdx  ? C.quizColor :
                    i === currentIdx ? C.primary  : C.bgMuted
                  }
                />
              ))}
            </Stack>
            <Stack horizontal justifyContent="space-between">
              <Text variant="caption" color={C.textMuted}>
                Question {currentIdx + 1}/{totalQuestions}
              </Text>
              <Text variant="caption" color={C.textMuted}>
                {Object.keys(answers).length} answered
              </Text>
            </Stack>
          </Stack>

          {/* Question text */}
          <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20} marginBottom={20}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <Stack
              backgroundColor={C.quizBg} borderRadius={10}
              paddingHorizontal={10} paddingVertical={4}
              style={{ alignSelf: 'flex-start', marginBottom: 12 }}
            >
              <Text variant="caption" color={C.quizColor} fontWeight="700">
                Q{currentIdx + 1}
              </Text>
            </Stack>
            <RichText content={currentQuestion.question} fontSize={14} />
          </StyledCard>

          {/* Options */}
          <Stack gap={10} marginBottom={28}>
            {options.map((opt: any) => {
              const isSelected = selected === opt.id
              return (
                <StyledPressable
                  key={opt.id}
                  backgroundColor={isSelected ? C.quizBg : C.bgCard}
                  borderRadius={16} padding={16}
                  borderWidth={isSelected ? 2 : 1}
                  borderColor={isSelected ? C.quizColor : C.border}
                  horizontal alignItems="center" gap={14}
                  onPress={() => answer(currentQuestion.id, opt.id)}
                  style={isSelected ? {
                    shadowColor: C.quizColor, shadowOpacity: 0.15,
                    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
                  } : undefined}
                >
                  <Stack
                    width={36} height={36} borderRadius={10}
                    backgroundColor={isSelected ? C.quizColor : C.bgMuted}
                    alignItems="center" justifyContent="center"
                    style={{ flexShrink: 0 }}
                  >
                    <Text variant="label"
                      color={isSelected ? C.white : C.textSecondary}
                      fontWeight="800"
                    >{opt.id.toUpperCase()}</Text>
                  </Stack>
                  <Text
                    variant="body" fontWeight={isSelected ? '600' : '400'}
                    color={isSelected ? C.quizColor : C.textPrimary}
                    style={{ flex: 1, lineHeight: 22 }}
                  >{opt.text}</Text>
                </StyledPressable>
              )
            })}
          </Stack>

          {/* Navigation */}
          <Stack horizontal gap={12}>
            {currentIdx > 0 && (
              <StyledButton
                backgroundColor={C.bgCard} borderRadius={14} paddingVertical={15}
                borderWidth={1} borderColor={C.border} flex={1}
                onPress={prev}
              >
                <Text variant="button" color={C.textPrimary}>← Previous</Text>
              </StyledButton>
            )}
            {currentIdx < totalQuestions - 1 ? (
              <StyledButton
                backgroundColor={selected ? C.quizColor : C.bgMuted}
                borderRadius={14} paddingVertical={15}
                flex={1} disabled={!selected}
                onPress={next}
                style={selected ? {
                  shadowColor: C.quizColor, shadowOpacity: 0.3,
                  shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
                } : undefined}
              >
                <Text variant="button" color={selected ? C.white : C.textMuted}>
                  Next →
                </Text>
              </StyledButton>
            ) : (
              <StyledButton
                backgroundColor={C.quizColor} borderRadius={14} paddingVertical={15}
                flex={1} loading={submitting} onPress={submit}
                style={{
                  shadowColor: C.quizColor, shadowOpacity: 0.3,
                  shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
                }}
              >
                <Text variant="button" color={C.white}>Submit quiz</Text>
              </StyledButton>
            )}
          </Stack>
        </StyledScrollView>
      </StyledPage>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (phase === 'results' && results) {
    const pct      = Math.round(results.score)
    const scoreClr = pct >= 70 ? C.success   : pct >= 50 ? C.warning   : C.error
    const scoreBg  = pct >= 70 ? C.successBg : pct >= 50 ? C.warningBg : C.errorBg
    const resultIcon: keyof typeof Feather.glyphMap = pct >= 70 ? 'award' : pct >= 50 ? 'thumbs-up' : 'book'

    return (
      <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
        statusBarStyle={isDark ? 'light-content' : 'dark-content'}
        statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
      >
        <ScreenHeader title="Quiz Results" onBackPress={reset} />
        <StyledScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>

          {/* Score card */}
          <Stack
            backgroundColor={scoreBg}
            borderRadius={24} padding={28} marginBottom={24}
            alignItems="center" gap={10}
            style={{
              borderWidth: 1, borderColor: `${scoreClr}33`,
              shadowColor: scoreClr, shadowOpacity: 0.12,
              shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
            }}
          >
            <Feather name={resultIcon} size={46} color={scoreClr} />
            <Text style={{ fontSize: 56, fontWeight: '800', color: scoreClr, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>
              {pct}%
            </Text>
            <Text variant="subtitle" color={scoreClr} fontWeight="700">
              {results.correct} of {results.total} correct
            </Text>
            <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 22 }}>
              {pct >= 70
                ? 'Excellent work! You have a strong grasp of this material.'
                : pct >= 50
                ? 'Good effort — review the explanations below to improve.'
                : 'Keep studying and try again — you\'ve got this!'}
            </Text>
          </Stack>

          {/* Question review */}
          <Text variant="subtitle" color={C.textPrimary} fontWeight="700" marginBottom={14}>
            Question review
          </Text>
          <Stack gap={10}>
            {results.questions.map((q: any) => {
              const correct    = q.is_correct
              const borderColor = correct ? C.success : C.error
              const bgColor     = correct ? C.successBg : C.errorBg

              return (
                <StyledCard key={q.id} backgroundColor={C.bgCard} borderRadius={18} padding={16}
                  style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack horizontal alignItems="flex-start" gap={10} marginBottom={12}>
                    <Stack
                      width={26} height={26} borderRadius={13}
                      backgroundColor={bgColor}
                      alignItems="center" justifyContent="center"
                      style={{ flexShrink: 0, marginTop: 1 }}
                    >
                      <Feather name={correct ? 'check' : 'x'} size={13} color={borderColor} />
                    </Stack>
                    <Text variant="body" color={C.textPrimary} fontWeight="600"
                      style={{ flex: 1, lineHeight: 22 }}
                    >{q.question}</Text>
                  </Stack>
                  <Stack
                    backgroundColor={bgColor} borderRadius={12} padding={12}
                    style={{ borderWidth: 1, borderColor: `${borderColor}30` }}
                  >
                    {!correct && (
                      <Stack horizontal alignItems="center" gap={5} marginBottom={4}>
                        <Feather name="x" size={12} color={borderColor} />
                        <Text variant="caption" color={borderColor} fontWeight="700">
                          Correct answer: {q.correct_answer.toUpperCase()}
                        </Text>
                      </Stack>
                    )}
                    {correct && (
                      <Stack horizontal alignItems="center" gap={5} marginBottom={4}>
                        <Feather name="check" size={12} color={borderColor} />
                        <Text variant="caption" color={borderColor} fontWeight="700">
                          Correct!
                        </Text>
                      </Stack>
                    )}
                    <RichText content={q.explanation} fontSize={13} />
                  </Stack>
                </StyledCard>
              )
            })}
          </Stack>

          <Stack gap={10} marginTop={24}>
            <StyledButton
              backgroundColor={C.quizColor} borderRadius={16} paddingVertical={16}
              onPress={reset}
              style={{
                shadowColor: C.quizColor, shadowOpacity: 0.3,
                shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
              }}
            >
              <Text variant="button" color={C.white}>Try another quiz</Text>
            </StyledButton>
            <StyledPressable
              onPress={() => shareText(
                formatQuizResults(results, activeCourseCode || 'Module', topic || undefined),
                'studymind-quiz-results.txt',
                toast,
              )}
              backgroundColor={C.bgCard} borderRadius={14} paddingVertical={14}
              alignItems="center" borderWidth={1} borderColor={C.border}
            >
              <Stack horizontal alignItems="center" gap={6}>
                <Feather name="share" size={15} color={C.textPrimary} />
                <Text variant="label" color={C.textPrimary}>Share results</Text>
              </Stack>
            </StyledPressable>
            <StyledButton
              backgroundColor={C.bgCard} borderRadius={16} paddingVertical={16}
              borderWidth={1} borderColor={C.border}
              onPress={() => router.back()}
            >
              <Text variant="button" color={C.textPrimary}>Back to module</Text>
            </StyledButton>
          </Stack>

        </StyledScrollView>
      </StyledPage>
    )
  }

  return null
}
