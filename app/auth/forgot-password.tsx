import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack, StyledPressable, StyledForm, useToast, useLoader,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { GradientButton, EyeToggle, EMAIL_RE } from '../../src/components/AuthUI'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { authService } from '../../src/services/api'
import { useAuth } from '../../src/hooks'

// A real modal screen (native sheet) rather than an RN <Modal>, which can render blank on device.
export default function ForgotPasswordScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const { login } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [tried,    setTried]    = useState(false)
  const [busy,     setBusy]     = useState(false)

  const FC = getFieldColors(C)
  const emailOk = EMAIL_RE.test(email.trim())
  const rules = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase',     ok: /[A-Z]/.test(password) },
    { label: 'Number',        ok: /\d/.test(password) },
  ]
  const passwordOk = rules.every((r) => r.ok)

  const close = () => (router.canGoBack() ? router.back() : router.replace('/auth/login'))

  const submit = async () => {
    setTried(true)
    if (!emailOk || !passwordOk) return
    setBusy(true)
    const loadId = loader.show({ label: 'Resetting…', variant: 'dots' })
    try {
      await authService.forgotPassword(email, password)
      toast.success('Password updated', 'Signing you in…')
      await login(email, password)   // signs in and goes to the app
    } catch (e: any) {
      toast.error('Could not reset password', e.message)
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
        <Stack horizontal alignItems="center" justifyContent="space-between" paddingHorizontal={20} paddingTop={22} paddingBottom={10}>
          <Stack>
            <Text variant="overline" color={C.primary}>Account</Text>
            <Text variant="subtitle" color={C.textPrimary} fontWeight="800">Reset your password</Text>
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
          <Text variant="body" color={C.textSecondary} style={{ marginBottom: 20, lineHeight: 22 }}>
            Enter your email and choose a new password. You'll be signed in straight away.
          </Text>

          <Stack gap={16} marginBottom={22}>
            <StyledForm.Input
              label="Email address" placeholder="you@example.com"
              value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next"
              errorMessage={tried && !emailOk ? 'Enter a valid email address' : undefined}
              leftIcon={<Feather name="mail" size={18} color={C.textSecondary} />}
              colors={FC}
            />
            <Stack gap={10}>
              <StyledForm.Input
                label="New password" placeholder="Create a new password"
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPw} returnKeyType="go" onSubmitEditing={submit}
                leftIcon={<Feather name="lock" size={18} color={C.textSecondary} />}
                rightIcon={<EyeToggle shown={showPw} onPress={() => setShowPw((v) => !v)} />}
                colors={FC}
              />
              <Stack horizontal gap={8} style={{ flexWrap: 'wrap' }}>
                {rules.map((r) => {
                  const bad  = tried && !r.ok
                  const tint = r.ok ? C.success : bad ? C.error : C.textMuted
                  return (
                    <Stack key={r.label} horizontal alignItems="center" gap={5} borderRadius={100}
                      paddingHorizontal={10} paddingVertical={5}
                      backgroundColor={r.ok ? C.successBg : bad ? C.errorBg : C.bgMuted}
                    >
                      <Feather name={r.ok ? 'check' : 'circle'} size={11} color={tint} />
                      <Text variant="caption" color={tint} fontWeight="600" style={{ fontSize: 11 }}>{r.label}</Text>
                    </Stack>
                  )
                })}
              </Stack>
            </Stack>
          </Stack>

          <GradientButton label="Reset password" arrow={false} loading={busy} onPress={submit} />
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
