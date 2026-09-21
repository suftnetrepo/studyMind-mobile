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
import { flashcardService } from '../../src/services/api'
import { quotaGate, incrementQuota } from '../../src/utils/quota'
import { setPendingDeck } from '../../src/utils/deckBridge'

const CARD_COUNTS = [10, 15, 20, 30] as const

// A real modal screen (native sheet), not an RN <Modal>: a transparent Modal can render only its
// backdrop on a physical iPhone.
export default function CreateDeckScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const { activeModuleId, activeCourseCode, activeModuleTitle } = useModuleStore()

  const [maxCards, setMaxCards] = useState<number>(20)
  const [topic,    setTopic]    = useState('')
  const [busy,     setBusy]     = useState(false)

  const close = () => (router.canGoBack() ? router.back() : router.replace('/flashcards' as any))

  const create = async () => {
    if (!activeModuleId) {
      toast.warning('No module selected', 'Open a module before creating flashcards.')
      return
    }
    if (!(await quotaGate('flashcard'))) return
    setBusy(true)
    const loadId = loader.show({ label: 'Creating flashcards…', variant: 'dots' })
    try {
      const res = await flashcardService.generate(activeModuleId, maxCards, topic.trim() || undefined)
      await incrementQuota('flashcard')
      setPendingDeck(res.id)
      close()
    } catch (e: any) {
      toast.error('Could not create flashcards', e.message)
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
            <Text variant="overline" color={C.flashColor}>New flashcards</Text>
            <Text variant="subtitle" color={C.textPrimary} fontWeight="800" numberOfLines={1}>
              {activeCourseCode || activeModuleTitle || 'Flashcards'}
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
          <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>Number of cards</Text>
          <Stack horizontal gap={8} marginBottom={24}>
            {CARD_COUNTS.map((n) => (
              <StyledPressable key={n} flex={1} onPress={() => setMaxCards(n)}
                backgroundColor={maxCards === n ? C.flashColor : C.bgCard}
                borderRadius={12} paddingVertical={13} alignItems="center"
                borderWidth={1.5} borderColor={maxCards === n ? C.flashColor : C.border}
              >
                <Text variant="title" color={maxCards === n ? C.white : C.textSecondary} fontWeight="800" style={{ fontSize: 18 }}>{n}</Text>
              </StyledPressable>
            ))}
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

          <StyledButton backgroundColor={C.flashColor} borderRadius={16} paddingVertical={17}
            loading={busy} onPress={create}
            style={{ shadowColor: C.flashColor, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}
          >
            <Text variant="button" color={C.white}>{busy ? 'Creating flashcards…' : `Create ${maxCards} flashcards`}</Text>
          </StyledButton>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
