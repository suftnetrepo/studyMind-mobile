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
import { moduleService } from '../../src/services/api'
import { useModules } from '../../src/hooks'

// A real modal screen (native sheet), not an in-sheet form: the ActionSheet
// host has no keyboard-avoidance of its own, so autoFocus opened the
// keyboard straight over the title/button with no way to reach either —
// same class of bug the quiz/flashcards/summary create panels hit before
// they moved to real modal routes.
export default function CreateModuleScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const { refetch } = useModules()

  const [title,      setTitle]      = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [busy,        setBusy]      = useState(false)

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/modules' as any))

  const create = async () => {
    const t = title.trim()
    if (!t) return
    setBusy(true)
    try {
      await moduleService.create({ title: t, course_code: courseCode.trim() || undefined })
      await refetch(true)
      toast.success('Module created!', `${t} is ready.`)
      close()
    } catch (e: any) {
      toast.error('Could not create module', e.message)
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
          <Text variant="subtitle" color={C.textPrimary} fontWeight="800">Create module</Text>
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
            <Stack gap={8} marginBottom={18}>
              <Text variant="label" color={C.textPrimary} fontWeight="700">Module title</Text>
              <Stack backgroundColor={C.bgInput} borderRadius={14} borderWidth={1} borderColor={C.border}
                paddingHorizontal={16} paddingVertical={12}
              >
                <TextInput
                  value={title} onChangeText={setTitle}
                  placeholder="e.g. Python Programming, IELTS Prep"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                  style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' }}
                />
              </Stack>
            </Stack>

            <Stack gap={8} marginBottom={28}>
              <Text variant="label" color={C.textPrimary} fontWeight="700">Course code (optional)</Text>
              <Stack backgroundColor={C.bgInput} borderRadius={14} borderWidth={1} borderColor={C.border}
                paddingHorizontal={16} paddingVertical={12}
              >
                <TextInput
                  value={courseCode} onChangeText={setCourseCode}
                  placeholder="e.g. CSC109"
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={create}
                  style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' }}
                />
              </Stack>
            </Stack>

            <Stack style={{ flex: 1 }} justifyContent="flex-end">
              <LoadingButton
                backgroundColor={title.trim() ? C.primary : C.bgMuted}
                borderRadius={16} paddingVertical={17}
                loading={busy}
                onPress={title.trim() ? create : () => {}}
                label="Create module"
                spinnerColor={title.trim() ? C.white : C.textMuted}
                style={title.trim() ? { shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 } : undefined}
              />
            </Stack>
          </StyledScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
