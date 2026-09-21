import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack, StyledCard, StyledPressable, StyledForm,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { AuthBackground, BrandMark, GradientButton, OrDivider, EyeToggle, EMAIL_RE } from '../../src/components/AuthUI'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { useAuth } from '../../src/hooks'

const DEMOS = [
  { role: 'Lecturer', icon: 'briefcase', email: 'lecturer@demo.ac.uk', password: 'Lecturer1234' },
  { role: 'Student',  icon: 'award',     email: 'student@demo.ac.uk',  password: 'Student1234'  },
] as const

export default function LoginScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { login, loading } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [tried,    setTried]    = useState(false)

  const FC = getFieldColors(C)
  const emailError = tried && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address' : undefined
  const pwError    = tried && !password ? 'Enter your password' : undefined

  const submit = () => {
    setTried(true)
    if (!EMAIL_RE.test(email.trim()) || !password) return
    login(email, password)
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <AuthBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Stack marginBottom={36}>
            <BrandMark />
          </Stack>

          <StyledCard backgroundColor={C.bgCard} borderRadius={22} padding={20} marginBottom={14}
            style={{
              borderWidth: 1, borderColor: C.border,
              shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 }, elevation: 4,
            }}
          >
            <Stack gap={16}>
              <StyledForm.Input
                label="Email address"
                placeholder="you@university.ac.uk"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                errorMessage={emailError}
                leftIcon={<Feather name="mail" size={18} color={C.textSecondary} />}
                colors={FC}
              />
              <StyledForm.Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                returnKeyType="go"
                onSubmitEditing={submit}
                errorMessage={pwError}
                leftIcon={<Feather name="lock" size={18} color={C.textSecondary} />}
                rightIcon={<EyeToggle shown={showPw} onPress={() => setShowPw((v) => !v)} />}
                colors={FC}
              />
            </Stack>
          </StyledCard>

          <Stack alignItems="flex-end" marginBottom={4}>
            <StyledPressable onPress={() => router.push('/auth/forgot-password' as any)} hitSlop={8}>
              <Text variant="bodySmall" color={C.primary} fontWeight="700">Forgot password?</Text>
            </StyledPressable>
          </Stack>

          <Stack marginTop={8}>
            <GradientButton label="Sign in" loading={loading} onPress={submit} />
          </Stack>

          <OrDivider />

          <Stack horizontal alignItems="center" justifyContent="center" gap={5}>
            <Text variant="bodySmall" color={C.textSecondary}>Don't have an account?</Text>
            <StyledPressable onPress={() => router.push('/auth/register')}>
              <Text variant="bodySmall" color={C.primary} fontWeight="700">Create one</Text>
            </StyledPressable>
          </Stack>

          {__DEV__ && (
            <StyledCard
              backgroundColor={C.primaryBg} borderRadius={16} padding={14} marginTop={26}
              style={{ borderWidth: 1, borderColor: `${C.primary}30` }}
            >
              <Stack gap={10}>
                <Stack horizontal alignItems="center" gap={8}>
                  <Feather name="info" size={15} color={C.primary} />
                  <Text variant="caption" color={C.primary} fontWeight="700">
                    Demo credentials (tap to fill)
                  </Text>
                </Stack>
                {DEMOS.map((d) => (
                  <StyledPressable key={d.role} onPress={() => { setEmail(d.email); setPassword(d.password) }}>
                    <Stack horizontal alignItems="center" gap={12} backgroundColor={C.bgCard}
                      borderRadius={12} padding={10}
                    >
                      <Stack width={34} height={34} borderRadius={10} backgroundColor={C.primaryBg}
                        alignItems="center" justifyContent="center"
                      >
                        <Feather name={d.icon} size={15} color={C.primary} />
                      </Stack>
                      <Stack flex={1}>
                        <Text variant="caption" color={C.textPrimary} fontWeight="700">{d.role}</Text>
                        <Text variant="caption" color={C.textSecondary}>{d.email}</Text>
                      </Stack>
                      <Feather name="corner-down-left" size={14} color={C.textMuted} />
                    </Stack>
                  </StyledPressable>
                ))}
              </Stack>
            </StyledCard>
          )}

        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
