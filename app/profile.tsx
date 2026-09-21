import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack, StyledCard, StyledButton, StyledForm, StyledPressable,
  useToast, useLoader,
} from 'fluent-styles'
import { Text } from '../src/components/Text'
import { ScreenHeader } from '../src/components/ScreenHeader'
import { useColors, useIsDark, getFieldColors } from '../src/constants'
import { useAuthStore } from '../src/stores'
import { authService } from '../src/services/api'

type Icon = keyof typeof Feather.glyphMap

const ROLE_META: Record<string, { label: string; icon: Icon }> = {
  student:      { label: 'Student',       icon: 'award'     },
  lecturer:     { label: 'Lecturer',      icon: 'briefcase' },
  self_learner: { label: 'Self-learner',  icon: 'book'      },
  admin:        { label: 'Administrator', icon: 'shield'    },
}

export default function ProfileScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(user?.full_name ?? '')

  const role     = ROLE_META[user?.role || 'student'] ?? ROLE_META.student
  const initials = user?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'
  const joined   = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '-'

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings' as any))

  const save = async () => {
    const next = name.trim()
    if (next.length < 2) {
      toast.warning('Name too short', 'Enter at least 2 characters.')
      return
    }
    if (next === user?.full_name) { setEditing(false); return }
    const loadId = loader.show({ label: 'Saving…', variant: 'dots' })
    try {
      const me = await authService.updateMe(next)
      setUser(me)
      toast.success('Profile updated', 'Your name has been saved.')
      setEditing(false)
    } catch (e: any) {
      toast.error('Could not save', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const details: { icon: Icon; label: string; value: string; fg: string; bg: string }[] = [
    { icon: 'mail',     label: 'Email',        value: user?.email ?? '-', fg: C.chatColor,  bg: C.chatBg  },
    { icon: role.icon,  label: 'Account type', value: role.label,         fg: C.quizColor,  bg: C.quizBg  },
    { icon: 'calendar', label: 'Member since', value: joined,             fg: C.sumColor,   bg: C.sumBg   },
  ]

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader title="Profile" subtitle="Your details and progress" onBackPress={goBack} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        >
          {/* Identity */}
          <Stack alignItems="center" gap={6} marginTop={4} marginBottom={22}>
            <Stack width={116} height={116} borderRadius={58} backgroundColor={C.primaryBg}
              alignItems="center" justifyContent="center"
            >
              <Stack width={92} height={92} borderRadius={46} backgroundColor={C.primary}
                alignItems="center" justifyContent="center"
                style={{ shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}
              >
                <Text variant="title" color={C.white} fontWeight="800" style={{ fontSize: 32 }}>{initials}</Text>
              </Stack>
            </Stack>
            <Text variant="title" color={C.textPrimary} fontWeight="800" textAlign="center" numberOfLines={1} style={{ marginTop: 10 }}>
              {user?.full_name || 'User'}
            </Text>
            <Text variant="body" color={C.textSecondary} numberOfLines={1}>{user?.email}</Text>
            <Stack horizontal alignItems="center" gap={6} backgroundColor={C.primaryBg}
              borderRadius={12} paddingHorizontal={12} paddingVertical={6} style={{ marginTop: 6 }}
            >
              <Feather name={role.icon} size={13} color={C.primary} />
              <Text variant="caption" color={C.primary} fontWeight="700">{role.label}</Text>
            </Stack>
          </Stack>

          {/* Account details */}
          <Text variant="body" paddingHorizontal={18} marginVertical={10} color={C.textMuted} >Account</Text>
          <StyledCard backgroundColor={C.bgCard} borderRadius={18} style={{ borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            {/* Name (editable) */}
            <Stack padding={16} gap={12} style={{ borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Stack horizontal alignItems="center" gap={14}>
                <Stack width={40} height={40} borderRadius={12} backgroundColor={C.flashBg} alignItems="center" justifyContent="center">
                  <Feather name="user" size={18} color={C.flashColor} />
                </Stack>
                <Stack flex={1}>
                  <Text variant="caption" color={C.textSecondary}>Full name</Text>
                  <Text variant="label" color={C.textPrimary} fontWeight="700" numberOfLines={1}>{user?.full_name || '-'}</Text>
                </Stack>
                {!editing && (
                  <StyledPressable onPress={() => setEditing(true)} hitSlop={8}>
                    <Stack horizontal alignItems="center" gap={6} backgroundColor={C.primaryBg} borderRadius={10}
                      paddingHorizontal={12} paddingVertical={7}
                    >
                      <Feather name="edit-2" size={13} color={C.primary} />
                      <Text variant="caption" color={C.primary} fontWeight="700">Edit</Text>
                    </Stack>
                  </StyledPressable>
                )}
              </Stack>
              {editing && (
                <Stack gap={12}>
                  <StyledForm.Input
                    value={name} onChangeText={setName} placeholder="Your full name"
                    autoCapitalize="words" returnKeyType="done" onSubmitEditing={save}
                    leftIcon={<Feather name="user" size={18} color={C.textSecondary} />}
                    colors={getFieldColors(C)}
                  />
                  <Stack horizontal gap={10}>
                    <StyledButton flex={1} backgroundColor={C.bgMuted} borderRadius={12} paddingVertical={12}
                      onPress={() => { setName(user?.full_name ?? ''); setEditing(false) }}
                    >
                      <Text variant="button" color={C.textSecondary}>Cancel</Text>
                    </StyledButton>
                    <StyledButton flex={1} backgroundColor={C.primary} borderRadius={12} paddingVertical={12} onPress={save}>
                      <Text variant="button" color={C.white}>Save</Text>
                    </StyledButton>
                  </Stack>
                </Stack>
              )}
            </Stack>

            {details.map((d, i) => (
              <Stack key={d.label} horizontal alignItems="center" gap={14} padding={16}
                style={i < details.length - 1 ? { borderBottomWidth: 1, borderBottomColor: C.border } : undefined}
              >
                <Stack width={40} height={40} borderRadius={12} backgroundColor={d.bg} alignItems="center" justifyContent="center">
                  <Feather name={d.icon} size={18} color={d.fg} />
                </Stack>
                <Stack flex={1}>
                  <Text variant="caption" color={C.textSecondary}>{d.label}</Text>
                  <Text variant="label" color={C.textPrimary} fontWeight="700" numberOfLines={1}>{d.value}</Text>
                </Stack>
              </Stack>
            ))}
          </StyledCard>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
