import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledButton, StyledPressable, StyledForm,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { useAuth } from '../../src/hooks'

type Role = 'student' | 'lecturer' | 'self_learner'

const ROLES: { key: Role; icon: keyof typeof Feather.glyphMap; label: string; desc: string }[] = [
  { key: 'student',      icon: 'award',     label: 'Student',      desc: 'Join a university module' },
  { key: 'lecturer',     icon: 'briefcase', label: 'Lecturer',     desc: 'Teach and upload materials' },
  { key: 'self_learner', icon: 'book',      label: 'Self-learner', desc: 'Study at your own pace' },
]

export default function RegisterScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { register, loading } = useAuth()

  const [role,     setRole]     = useState<Role>('student')
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  const FC = getFieldColors(C)
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/auth/login'))

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader
        title="Create account"
        subtitle="Join StudyMind AI to get started"
        onBackPress={goBack}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Role picker */}
          <Stack gap={10} marginBottom={20}>
            <Text variant="subLabel" color={C.textSecondary} fontWeight="600">I am a…</Text>
            {ROLES.map(({ key, icon, label, desc }) => (
              <StyledPressable
                key={key}
                backgroundColor={role === key ? C.primaryBg : C.bgCard}
                borderRadius={14} padding={14}
                borderWidth={1.5}
                borderColor={role === key ? C.primary : C.border}
                onPress={() => setRole(key)}
              >
                <Stack horizontal alignItems="center" gap={14}>
                  <Stack
                    width={44} height={44} borderRadius={12}
                    backgroundColor={role === key ? `${C.primary}20` : C.bgMuted}
                    alignItems="center" justifyContent="center"
                  >
                    <Feather name={icon} size={19} color={role === key ? C.primary : C.textSecondary} />
                  </Stack>
                  <Stack flex={1} gap={2}>
                    <Text variant="label"
                      color={role === key ? C.primary : C.textPrimary}
                      fontWeight={role === key ? '700' : '500'}
                    >{label}</Text>
                    <Text variant="caption" color={C.textSecondary}>{desc}</Text>
                  </Stack>
                  {role === key && (
                    <Stack
                      width={22} height={22} borderRadius={11}
                      backgroundColor={C.primary}
                      alignItems="center" justifyContent="center"
                    >
                      <Feather name="check" size={12} color={C.white} />
                    </Stack>
                  )}
                </Stack>
              </StyledPressable>
            ))}
          </Stack>

          {/* Fields */}
          <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20} marginBottom={16}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <Stack gap={16}>
              <StyledForm.Input
                label="Full name"
                placeholder="Jane Smith"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                colors={FC}
              />
              <StyledForm.Input
                label="Email address"
                placeholder="you@university.ac.uk"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                colors={FC}
              />
              <StyledForm.Input
                label="Password"
                placeholder="Min. 8 characters, 1 uppercase, 1 number"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                colors={FC}
              />
            </Stack>
          </StyledCard>

          <StyledButton
            backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
            loading={loading}
            onPress={() => register(email, password, fullName || email.split('@')[0], role)}
            style={{
              shadowColor: C.primary, shadowOpacity: 0.35,
              shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
            }}
          >
            <Text variant="button" color={C.white}>
              {loading ? 'Please wait…' : 'Create account'}
            </Text>
          </StyledButton>

          <Stack horizontal alignItems="center" justifyContent="center" gap={5} marginTop={20}>
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
