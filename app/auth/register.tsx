import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack, StyledCard, StyledPressable, StyledForm,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { AuthBackground, BrandMark, GradientButton, EyeToggle, EMAIL_RE } from '../../src/components/AuthUI'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { useAuth } from '../../src/hooks'

export default function RegisterScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { register, loading } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [tried,    setTried]    = useState(false)

  const FC = getFieldColors(C)
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/auth/login'))

  const rules = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase',     ok: /[A-Z]/.test(password) },
    { label: 'Number',        ok: /\d/.test(password) },
  ]
  const passwordOk = rules.every((r) => r.ok)
  const nameOk     = fullName.trim().length >= 2
  const emailOk    = EMAIL_RE.test(email.trim())

  const submit = () => {
    setTried(true)
    if (!nameOk || !emailOk || !passwordOk) return
    register(email, password, fullName.trim())
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <AuthBackground />
      {/* Back button only: the icon and form below are laid out like the login screen */}
      <ScreenHeader title="" onBackPress={goBack} transparent />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Stack marginBottom={32}>
            <BrandMark />
          </Stack>

          <StyledCard backgroundColor={C.bgCard} borderRadius={22} padding={20} marginBottom={20}
            style={{
              borderWidth: 1, borderColor: C.border,
              shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 }, elevation: 4,
            }}
          >
            <Stack gap={16}>
              <StyledForm.Input
                label="Full name" placeholder="Jane Smith"
                value={fullName} onChangeText={setFullName}
                autoCapitalize="words" returnKeyType="next"
                errorMessage={tried && !nameOk ? 'Enter your full name' : undefined}
                leftIcon={<Feather name="user" size={18} color={C.textSecondary} />}
                colors={FC}
              />
              <StyledForm.Input
                label="Email address" placeholder="you@university.ac.uk"
                value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next"
                errorMessage={tried && !emailOk ? 'Enter a valid email address' : undefined}
                leftIcon={<Feather name="mail" size={18} color={C.textSecondary} />}
                colors={FC}
              />
              <Stack gap={10}>
                <StyledForm.Input
                  label="Password" placeholder="Create a password"
                  value={password} onChangeText={setPassword}
                  secureTextEntry={!showPw} returnKeyType="go" onSubmitEditing={submit}
                  leftIcon={<Feather name="lock" size={18} color={C.textSecondary} />}
                  rightIcon={<EyeToggle shown={showPw} onPress={() => setShowPw((v) => !v)} />}
                  colors={FC}
                />
                <Stack horizontal gap={8} style={{ flexWrap: 'wrap' }}>
                  {rules.map((r) => {
                    const bad = tried && !r.ok
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
          </StyledCard>

          <GradientButton label="Create account" loading={loading} onPress={submit} />

          <Stack horizontal alignItems="center" justifyContent="center" gap={5} marginTop={22}>
            <Text variant="bodySmall" color={C.textSecondary}>Already have an account?</Text>
            <StyledPressable onPress={goBack}>
              <Text variant="bodySmall" color={C.primary} fontWeight="700">Sign in</Text>
            </StyledPressable>
          </Stack>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
