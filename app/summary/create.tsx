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
import { summaryService } from '../../src/services/api'
import { quotaGate, incrementQuota } from '../../src/utils/quota'
import { setPendingSummary } from '../../src/utils/summaryBridge'

type Scope = 'module' | 'week' | 'document'

const SCOPES: { key: Scope; label: string; icon: keyof typeof Feather.glyphMap; desc: string }[] = [
  { key: 'module',   label: 'Full module',     icon: 'book-open', desc: 'All materials in this module'   },
  { key: 'week',     label: 'Current week',    icon: 'calendar',  desc: "This week's uploaded materials" },
  { key: 'document', label: 'Latest document', icon: 'file-text', desc: 'The most recently uploaded file' },
]

// A real modal screen (native sheet), not an RN <Modal>: a transparent Modal can render only its
// backdrop on a physical iPhone.
export default function CreateSummaryScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const { activeModuleId, activeCourseCode, activeModuleTitle } = useModuleStore()

  const [scope, setScope] = useState<Scope>('module')
  const [topic, setTopic] = useState('')
  const [busy,  setBusy]  = useState(false)

  const close = () => (router.canGoBack() ? router.back() : router.replace('/summary' as any))

  const create = async () => {
    if (!activeModuleId) {
      toast.warning('No module selected', 'Open a module before creating a summary.')
      return
    }
    if (!(await quotaGate('summary'))) return
    setBusy(true)
    const loadId = loader.show({ label: 'Creating summary…', variant: 'dots' })
    try {
      const res = await summaryService.generate(activeModuleId, scope, topic.trim() || undefined)
      await incrementQuota('summary')
      setPendingSummary(res.id)
      close()
    } catch (e: any) {
      toast.error('Could not create summary', e.message)
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
            <Text variant="subtitle" color={C.textPrimary} fontWeight="800" numberOfLines={1}>
              {activeCourseCode || activeModuleTitle || 'Summary'}
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
          <Text variant="label" color={C.textPrimary} fontWeight="700" marginBottom={10}>What to summarise</Text>
          <Stack gap={8} marginBottom={24}>
            {SCOPES.map(({ key, label, icon, desc }) => {
              const active = scope === key
              return (
                <StyledPressable key={key} onPress={() => setScope(key)}>
                  <Stack horizontal alignItems="center" gap={12}
                    backgroundColor={active ? C.sumBg : C.bgCard} borderRadius={14} padding={14}
                    style={{ borderWidth: 1.5, borderColor: active ? C.sumColor : C.border }}
                  >
                    <Stack width={38} height={38} borderRadius={11} alignItems="center" justifyContent="center"
                      backgroundColor={active ? C.sumColor : C.bgMuted}
                    >
                      <Feather name={icon} size={17} color={active ? C.white : C.textSecondary} />
                    </Stack>
                    <Stack flex={1}>
                      <Text variant="label" color={active ? C.sumColor : C.textPrimary} fontWeight="700">{label}</Text>
                      <Text variant="caption" color={C.textSecondary}>{desc}</Text>
                    </Stack>
                    {active && <Feather name="check-circle" size={20} color={C.sumColor} />}
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
            <Text variant="caption" color={C.textSecondary}>Leave blank to cover everything in scope</Text>
          </Stack>

          <StyledButton backgroundColor={C.sumColor} borderRadius={16} paddingVertical={17}
            loading={busy} onPress={create}
            style={{ shadowColor: C.sumColor, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}
          >
            <Text variant="button" color={C.white}>{busy ? 'Creating summary…' : 'Create summary'}</Text>
          </StyledButton>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
