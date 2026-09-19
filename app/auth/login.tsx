import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledButton, StyledPressable, StyledForm,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { useAuth } from '../../src/hooks'

export default function LoginScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { login, loading } = useAuth()

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
          <Stack alignItems="center" gap={12} marginBottom={40}>
            <Stack
              width={72} height={72} borderRadius={22}
              backgroundColor={C.primary} alignItems="center" justifyContent="center"
              style={{
                shadowColor: C.primary, shadowOpacity: 0.45,
                shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
              }}
            >
              <Feather name="book-open" size={32} color={C.white} />
            </Stack>
            <Stack alignItems="center" gap={4}>
              <Text variant="header" color={C.textPrimary} fontWeight="800">StudyMind AI</Text>
              <Text variant="body" color={C.textSecondary}>Your AI-powered study assistant</Text>
            </Stack>
          </Stack>

          {/* Fields */}
          <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20} marginBottom={16}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <Stack gap={16}>
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
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                colors={FC}
              />
            </Stack>
          </StyledCard>

          <Stack alignItems="flex-end" marginBottom={20}>
            <StyledPressable>
              <Text variant="bodySmall" color={C.primary} fontWeight="600">Forgot password?</Text>
            </StyledPressable>
          </Stack>

          <StyledButton
            backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
            loading={loading} onPress={() => login(email, password)}
            style={{
              shadowColor: C.primary, shadowOpacity: 0.35,
              shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
            }}
          >
            <Text variant="button" color={C.white}>
              {loading ? 'Please wait…' : 'Sign in'}
            </Text>
          </StyledButton>

          <Stack horizontal alignItems="center" justifyContent="center" gap={5} marginTop={20}>
            <Text variant="bodySmall" color={C.textSecondary}>Don't have an account?</Text>
            <StyledPressable onPress={() => router.push('/auth/register')}>
              <Text variant="bodySmall" color={C.primary} fontWeight="700">Create one</Text>
            </StyledPressable>
          </Stack>

          {/* Demo hint */}
          <StyledCard
            backgroundColor={C.primaryBg} borderRadius={14} padding={16} marginTop={24}
            style={{ borderWidth: 1, borderColor: `${C.primary}30` }}
          >
            <Stack horizontal alignItems="center" gap={10}>
              <Feather name="info" size={17} color={C.primary} />
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
