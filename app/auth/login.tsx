import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledButton, StyledPressable, StyledForm,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { useAuth } from '../../src/hooks'

type Role = 'student' | 'lecturer' | 'self_learner'

const ROLES: { key: Role; emoji: string; label: string; desc: string }[] = [
  { key: 'student',      emoji: '🎓', label: 'Student',      desc: 'Join a university module' },
  { key: 'lecturer',     emoji: '👨‍🏫', label: 'Lecturer',     desc: 'Teach and upload materials' },
  { key: 'self_learner', emoji: '📖', label: 'Self-learner', desc: 'Study at your own pace' },
]

export default function LoginScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { login, register, loading } = useAuth()

  const [tab,      setTab]      = useState<'login' | 'register'>('login')
  const [role,     setRole]     = useState<Role>('student')
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  const FC = getFieldColors(C)

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Stack alignItems="center" gap={12} marginBottom={32}>
            <Stack
              width={72} height={72} borderRadius={22}
              backgroundColor={C.primary} alignItems="center" justifyContent="center"
              style={{
                shadowColor: C.primary, shadowOpacity: 0.45,
                shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
              }}
            >
              <Text style={{ fontSize: 32 }}>📚</Text>
            </Stack>
            <Stack alignItems="center" gap={4}>
              <Text variant="header" color={C.textPrimary} fontWeight="800">StudyMind AI</Text>
              <Text variant="body" color={C.textSecondary}>Your AI-powered study assistant</Text>
            </Stack>
          </Stack>

          {/* Tab toggle */}
          <Stack
            horizontal backgroundColor={C.bgMuted}
            borderRadius={14} padding={4} marginBottom={28}
          >
            {(['login', 'register'] as const).map((t) => (
              <StyledPressable
                key={t} flex={1}
                backgroundColor={tab === t ? C.bgCard : 'transparent'}
                borderRadius={11} paddingVertical={11}
                alignItems="center" onPress={() => setTab(t)}
                style={tab === t ? {
                  shadowColor: '#000', shadowOpacity: 0.07,
                  shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
                } : undefined}
              >
                <Text variant="label"
                  color={tab === t ? C.textPrimary : C.textSecondary}
                  fontWeight={tab === t ? '700' : '500'}
                >
                  {t === 'login' ? 'Sign in' : 'Create account'}
                </Text>
              </StyledPressable>
            ))}
          </Stack>

          {/* Role picker — register only */}
          {tab === 'register' && (
            <Stack gap={10} marginBottom={20}>
              <Text variant="subLabel" color={C.textSecondary} fontWeight="600">I am a…</Text>
              {ROLES.map(({ key, emoji, label, desc }) => (
                <StyledPressable
                  key={key}
                  backgroundColor={role === key ? C.primaryBg : C.bgCard}
                  borderRadius={14} padding={14}
                  borderWidth={1.5}
                  borderColor={role === key ? C.primary : C.border}
                  horizontal alignItems="center" gap={14}
                  onPress={() => setRole(key)}
                >
                  <Stack
                    width={44} height={44} borderRadius={12}
                    backgroundColor={role === key ? `${C.primary}20` : C.bgMuted}
                    alignItems="center" justifyContent="center"
                  >
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
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
                      <Text style={{ fontSize: 11, color: C.white, fontWeight: '700' }}>✓</Text>
                    </Stack>
                  )}
                </StyledPressable>
              ))}
            </Stack>
          )}

          {/* Fields */}
          <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20} marginBottom={16}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <Stack gap={16}>
              {tab === 'register' && (
                <StyledForm.Input
                  label="Full name"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  colors={FC}
                />
              )}
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
                placeholder={tab === 'register' ? 'Min. 8 characters, 1 uppercase, 1 number' : '••••••••'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                colors={FC}
              />
            </Stack>
          </StyledCard>

          {tab === 'login' && (
            <Stack alignItems="flex-end" marginBottom={20}>
              <StyledPressable>
                <Text variant="bodySmall" color={C.primary} fontWeight="600">Forgot password?</Text>
              </StyledPressable>
            </Stack>
          )}

          <StyledButton
            backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
            loading={loading} onPress={() => {
              if (tab === 'login') login(email, password)
              else register(email, password, fullName || email.split('@')[0], role)
            }}
            style={{
              shadowColor: C.primary, shadowOpacity: 0.35,
              shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
            }}
          >
            <Text variant="button" color={C.white}>
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign in' : 'Create account'}
            </Text>
          </StyledButton>

          {/* Demo hint */}
          <StyledCard
            backgroundColor={C.primaryBg} borderRadius={14} padding={16} marginTop={24}
            style={{ borderWidth: 1, borderColor: `${C.primary}30` }}
          >
            <Stack horizontal alignItems="center" gap={10}>
              <Text style={{ fontSize: 18 }}>💡</Text>
              <Stack flex={1} gap={3}>
                <Text variant="caption" color={C.primary} fontWeight="700">Demo credentials</Text>
                <Text variant="caption" color={C.textSecondary}>lecturer@demo.ac.uk  /  Lecturer1234</Text>
                <Text variant="caption" color={C.textSecondary}>student@demo.ac.uk  /  Student1234</Text>
              </Stack>
            </Stack>
          </StyledCard>

        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
