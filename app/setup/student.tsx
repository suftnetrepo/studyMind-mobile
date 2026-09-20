import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack, StyledCard, StyledButton, StyledForm,
  useToast, useLoader,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { HeroIcon } from '../../src/components/setup'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { moduleService } from '../../src/services/api'
import { useAuthStore, setSetupDone } from '../../src/stores'

export default function StudentSetup() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const user   = useAuthStore((s) => s.user)
  const [code, setCode] = useState('')

  const finish = async () => {
    if (user?.id) await setSetupDone(user.id)
    router.replace('/(tabs)')
  }

  const handleJoin = async () => {
    const value = code.trim().toUpperCase()
    if (!value) {
      toast.warning('Enter a code', 'Ask your lecturer for the institution or module code.')
      return
    }
    const loadId = loader.show({ label: 'Joining…', variant: 'dots' })
    try {
      try {
        await moduleService.joinInstitution(value)
        toast.success('Joined!', 'Welcome to your institution.')
      } catch {
        await moduleService.enrolByCode(value)
        toast.success('Enrolled!', 'You have been added to the module.')
      }
      await finish()
    } catch {
      toast.error('Invalid code', 'Check the code and try again.')
    } finally {
      loader.hide(loadId)
    }
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 80, paddingBottom: 40, justifyContent: 'center' }}
        >
          <Stack alignItems="center" gap={16} marginBottom={36}>
            <HeroIcon name="book-open" size={100} />
            <Stack alignItems="center" gap={6}>
              <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center">
                Join your university
              </Text>
              <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24, maxWidth: 290 }}>
                Enter the code your lecturer gave you to access your course materials.
              </Text>
            </Stack>
          </Stack>

          <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20} marginBottom={16}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <StyledForm.Input
              label="Institution or enrolment code"
              placeholder="e.g. DEMO2025 or CSC109-AB12"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              colors={getFieldColors(C)}
            />
          </StyledCard>

          <StyledButton
            backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
            onPress={handleJoin}
            style={{
              shadowColor: C.primary, shadowOpacity: 0.35,
              shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
            }}
          >
            <Text variant="button" color={C.white}>Join now</Text>
          </StyledButton>

          <Stack
            horizontal gap={12} alignItems="flex-start" marginTop={20}
            backgroundColor={C.primaryBg} borderRadius={14} padding={16}
          >
            <Feather name="info" size={18} color={C.primary} style={{ marginTop: 1 }} />
            <Stack flex={1} gap={4}>
              <Text variant="label" color={C.primary} fontWeight="700">Where do I get a code?</Text>
              <Text variant="caption" color={C.textSecondary} style={{ lineHeight: 18 }}>
                Your lecturer or institution will share a code by email, on your student portal, or in class.
              </Text>
            </Stack>
          </Stack>

          <StyledButton backgroundColor="transparent" borderRadius={16} paddingVertical={14} marginTop={12} onPress={finish}>
            <Text variant="body" color={C.textSecondary}>Skip for now</Text>
          </StyledButton>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
