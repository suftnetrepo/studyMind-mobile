import React, { useState } from 'react'
import { Platform, TextInput, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack, StyledPressable, StyledButton, useToast, useLoader,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { quizService } from '../../src/services/api'
import { quotaGate, incrementQuota } from '../../src/utils/quota'
import { setPendingQuiz } from '../../src/utils/quizBridge'

const Q_COUNTS = [5, 10, 15, 20] as const
const Q_TYPES: { key: 'mcq' | 'true_false'; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'mcq',        label: 'Multiple choice', icon: 'list'        },
  { key: 'true_false', label: 'True / false',    icon: 'toggle-left' },
]

// A real modal screen (native sheet), not an RN <Modal>: a transparent Modal can render only its
// backdrop on a physical iPhone, which is exactly what the previous panel did.
export default function CreateQuizScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const { activeModuleId, activeCourseCode, activeModuleTitle } = useModuleStore()

  const [qCount, setQCount] = useState<number>(5)
  const [qType,  setQType]  = useState<'mcq' | 'true_false'>('mcq')
  const [topic,  setTopic]  = useState('')
  const [busy,   setBusy]   = useState(false)

  const close = () => (router.canGoBack() ? router.back() : router.replace('/quiz' as any))

  const create = async () => {
    if (!activeModuleId) {
      toast.warning('No module selected', 'Open a module before creating a quiz.')
      return
    }
    if (!(await quotaGate('quiz'))) return
    setBusy(true)
    const loadId = loader.show({ label: 'Creating quiz…', variant: 'dots' })
    try {
      const t = topic.trim()
      const res = await quizService.generate(activeModuleId, qCount, qType, t ? `${t} Quiz` : 'Module Quiz', t || undefined)
      await incrementQuota('quiz')
      setPendingQuiz(res.id)
      close()
    } catch (e: any) {
      toast.error('Could not create quiz', e.message)
    } finally {
      loader.hide(loadId)
      setBusy(false)
    }
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} edges={['left', 'right']} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack horizontal alignItems="center" justifyContent="space-between" paddingHorizontal={20} paddingTop={22} paddingBottom={14}>
          <Stack>
            <Text variant="overline" color={C.quizColor}>New quiz</Text>
            <Text variant="subtitle" color={C.textPrimary} fontWeight="800" numberOfLines={1}>
              {activeCourseCode || activeModuleTitle || 'Quiz'}
            </Text>
          </Stack>
          <StyledPressable onPress={close} width={36} height={36} borderRadius={12}
            backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
          >
            <Feather name="x" size={18} color={C.textPrimary} />
          </StyledPressable>
        </Stack>

        <StyledScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        >
          <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>Number of questions</Text>
          <Stack horizontal gap={8} marginBottom={22}>
            {Q_COUNTS.map((n) => (
              <StyledPressable key={n} flex={1} onPress={() => setQCount(n)}
                backgroundColor={qCount === n ? C.quizColor : C.bgCard}
                borderRadius={12} paddingVertical={13} alignItems="center"
                borderWidth={1.5} borderColor={qCount === n ? C.quizColor : C.border}
              >
                <Text variant="title" color={qCount === n ? C.white : C.textSecondary} fontWeight="800" style={{ fontSize: 18 }}>{n}</Text>
              </StyledPressable>
            ))}
          </Stack>

          <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>Question type</Text>
          <Stack horizontal gap={8} marginBottom={22}>
            {Q_TYPES.map(({ key, label, icon }) => {
              const active = qType === key
              return (
                <StyledPressable key={key} onPress={() => setQType(key)}>
                  <Stack horizontal alignItems="center" gap={7}
                    backgroundColor={active ? C.quizBg : C.bgCard}
                    borderRadius={50} paddingHorizontal={16} paddingVertical={10}
                    style={{ borderWidth: 1.5, borderColor: active ? C.quizColor : C.border }}
                  >
                    <Feather name={icon} size={14} color={active ? C.quizColor : C.textSecondary} />
                    <Text variant="label" color={active ? C.quizColor : C.textSecondary} fontWeight={active ? '700' : '500'}>{label}</Text>
                  </Stack>
                </StyledPressable>
              )
            })}
          </Stack>

          <Stack gap={8} marginBottom={24}>
            <Text variant="label" color={C.textPrimary} fontWeight="700">Topic (optional)</Text>
            <Stack backgroundColor={C.bgInput} borderRadius={14} borderWidth={1} borderColor={C.border}
              paddingHorizontal={16} paddingVertical={12}
            >
              <TextInput
                value={topic} onChangeText={setTopic}
                placeholder="e.g. Python data types, photosynthesis"
                placeholderTextColor={C.textMuted}
                returnKeyType="done"
                style={{ color: C.textPrimary, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' }}
              />
            </Stack>
            <Text variant="caption" color={C.textSecondary}>Leave blank to cover everything in this module</Text>
          </Stack>

          <StyledButton backgroundColor={C.quizColor} borderRadius={16} paddingVertical={17}
            loading={busy} onPress={create}
            style={{ shadowColor: C.quizColor, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}
          >
            <Text variant="button" color={C.white}>{busy ? 'Creating quiz…' : `Create ${qCount} questions`}</Text>
          </StyledButton>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
