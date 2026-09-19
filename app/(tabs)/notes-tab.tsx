import React, { useCallback } from 'react'
import { Platform } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { StyledPage, Stack, StyledButton } from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'

export default function NotesTabScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { activeModuleId } = useModuleStore()

  // `replace` (not `push`) — this screen's only job is to redirect, so it
  // must not leave itself in the history stack. With `push`, tapping back
  // from /notes would return here and this effect would fire again,
  // pushing forward to /notes again — trapping the user unable to go back.
  useFocusEffect(
    useCallback(() => {
      if (activeModuleId) router.replace('/notes')
    }, [activeModuleId]),
  )

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <Stack flex={1} alignItems="center" justifyContent="center" padding={40} gap={16}>
        <Feather name="edit-3" size={48} color={C.textMuted} />
        <Text variant="title" color={C.textPrimary} fontWeight="800" textAlign="center">
          My Notes
        </Text>
        <Text variant="body" color={C.textSecondary} textAlign="center">
          Open a module first to start taking notes.
        </Text>
        <StyledButton
          backgroundColor={C.primary} borderRadius={14}
          paddingHorizontal={24} paddingVertical={12}
          onPress={() => router.push('/(tabs)/modules' as any)}
        >
          <Text variant="button" color={C.white}>Go to modules</Text>
        </StyledButton>
      </Stack>
    </StyledPage>
  )
}
