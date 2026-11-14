import React, { useState } from 'react'
import { Platform, TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack, StyledPressable, useToast,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { LoadingButton } from '../../src/components/LoadingButton'
import { useColors, useIsDark } from '../../src/constants'
import { api, moduleService } from '../../src/services/api'
import { useModules } from '../../src/hooks'

// A real modal screen (like module/create), not an in-sheet form: the ActionSheet host has no
// keyboard avoidance, so on iOS the keyboard covered the code box and the Join button.
export default function JoinModuleScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const { refetch } = useModules()

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/modules' as any))

  const join = async () => {
    const c = code.trim()
    if (!c) return
    setBusy(true)
    try {
      // A code may be an institution join code or a module enrolment code: try the institution
      // join first, then fall back to module enrolment on any failure (invalid code, or already
      // a member of an institution).
      try {
        await api.post('/api/institutions/join', { code: c })
        toast.success('Joined!', 'You now have access to your institution.')
      } catch {
        await moduleService.enrolByCode(c)
        toast.success('Enrolled!', 'You now have access to this module.')
      }
      await refetch(true)
      close()
    } catch (e: any) {
      toast.error('Could not join', e.message || 'Check the code and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} edges={['left', 'right']} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Stack horizontal alignItems="center" justifyContent="space-between" paddingHorizontal={20} paddingTop={22} paddingBottom={14}>
          <Text variant="subtitle" color={C.textPrimary} fontWeight="800">Join a course</Text>
          <StyledPressable onPress={close} width={36} height={36} borderRadius={12}
            backgroundColor={C.bgMuted} alignItems="center" justifyContent="center"
          >
            <Feather name="x" size={18} color={C.textPrimary} />
          </StyledPressable>
        </Stack>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <StyledScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1 }}
          >
            <Stack gap={8} marginBottom={28}>
              <Text variant="label" color={C.textPrimary} fontWeight="700">Enrolment code</Text>
              <Stack backgroundColor={C.bgInput} borderRadius={14} borderWidth={1} borderColor={C.border}
                paddingHorizontal={16} paddingVertical={12}
              >
                <TextInput
                  value={code} onChangeText={setCode}
                  placeholder="e.g. CSC109"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={join}
                  style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' }}
                />
              </Stack>
              <Text variant="caption" color={C.textSecondary}>Your lecturer shares this code in class or by email.</Text>
            </Stack>

            <Stack marginTop={4}>
              <LoadingButton
                backgroundColor={code.trim() ? C.primary : C.bgMuted}
                borderRadius={16} paddingVertical={17}
                loading={busy}
                onPress={code.trim() ? join : () => {}}
                label="Join course"
                spinnerColor={code.trim() ? C.white : C.textMuted}
                style={code.trim() ? { shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 } : undefined}
              />
            </Stack>
          </StyledScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
