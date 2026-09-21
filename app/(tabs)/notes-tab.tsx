import React, { useCallback } from 'react'
import { Platform } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { StyledPage, Stack, StyledButton } from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark } from '../../src/constants'
import { useModuleStore } from '../../src/stores'
import { useModules } from '../../src/hooks'

export default function NotesTabScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { activeModuleId, setActiveModule } = useModuleStore()
  const { data: modules, loading } = useModules()

  // The active module isn't remembered between launches, so on a fresh start fall back to the first
  // non-archived module (the same one Home shows notes for) instead of asking the user to pick one.
  React.useEffect(() => {
    if (activeModuleId || loading) return
    const first = modules.find((m: any) => m.status !== 'archived') ?? modules[0]
    if (first) setActiveModule(first.id, first.title, first.course_code)
  }, [activeModuleId, loading, modules, setActiveModule])

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
    <StyledPage flex={1} backgroundColor={C.bg} edges={["top", "left", "right"]} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      {/* While modules load (or a module is being picked) show nothing rather than flashing a prompt. */}
      {loading || activeModuleId || modules.length > 0 ? null : (
        <Stack flex={1} alignItems="center" justifyContent="center" padding={40} gap={16}>
          <Feather name="edit-3" size={48} color={C.textMuted} />
          <Text variant="title" color={C.textPrimary} fontWeight="800" textAlign="center">
            My Notes
          </Text>
          <Text variant="body" color={C.textSecondary} textAlign="center">
            Notes belong to a course. Create or join one first, then write your notes here.
          </Text>
          <StyledButton
            backgroundColor={C.primary} borderRadius={14}
            paddingHorizontal={24} paddingVertical={12}
            onPress={() => router.push('/(tabs)/modules' as any)}
          >
            <Text variant="button" color={C.white}>Go to modules</Text>
          </StyledButton>
        </Stack>
      )}
    </StyledPage>
  )
}
