import React, { useState } from 'react'
import { Platform, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, TabBar, type TabItem,
  useActionSheet, useToast, useDialogue,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, getModuleColors } from '../../src/constants'
import { useModuleStore, useAuthStore } from '../../src/stores'
import { useModules } from '../../src/hooks'
import { moduleService } from '../../src/services/api'

type Filter = 'all' | 'active' | 'archived'
const TABS: TabItem<Filter>[] = [
  { value: 'all',      label: 'All'      },
  { value: 'active',   label: 'Active'   },
  { value: 'archived', label: 'Archived' },
]

export default function ModulesScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const { data: modules, loading, refetch } = useModules()
  const [refreshing, setRefreshing] = React.useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    await refetch(true)
    setRefreshing(false)
  }

  // Tabs stay mounted, so refresh when this tab regains focus (the first focus is covered by the mount fetch).
  const isFocused = useIsFocused()
  const skipFirstFocus = React.useRef(true)
  React.useEffect(() => {
    if (!isFocused) return
    if (skipFirstFocus.current) { skipFirstFocus.current = false; return }
    refetch(true)
  }, [isFocused]) // eslint-disable-line react-hooks/exhaustive-deps
  const { setActiveModule, activeModuleId, clearActiveModule } = useModuleStore()
  const user = useAuthStore((s) => s.user)
  const [filter, setFilter] = useState<Filter>('all')

  const actionSheet = useActionSheet()
  const toast        = useToast()
  const dialogue     = useDialogue()


  const filtered = modules.filter((m) => {
    if (filter === 'all') return true
    return m.status === filter
  })

  const openJoinSheet = () => router.push('/module/join' as any)

  const openCreateSheet = () => router.push('/module/create' as any)

  const setArchived = async (mod: any, archive: boolean) => {
    try {
      await (archive ? moduleService.archive(mod.id) : moduleService.restore(mod.id))
      await refetch(true)
      toast.success(archive ? 'Archived' : 'Restored', archive
        ? `${mod.course_code || mod.title} is hidden from Home. Find it under Archived.`
        : `${mod.course_code || mod.title} is back in your active modules.`)
    } catch (e: any) {
      toast.error('Could not update module', e.message)
    }
  }

  const deleteModule = async (mod: any) => {
    const ok = await dialogue.confirm({
      title:        'Delete module?',
      message:      `"${mod.title}" will be permanently deleted with all its documents and conversations. This cannot be undone.`,
      icon:         '🗑️',
      confirmLabel: 'Delete',
      cancelLabel:  'Cancel',
      destructive:  true,
    })
    if (!ok) return
    try {
      await moduleService.deleteModule(mod.id)
      if (activeModuleId === mod.id) clearActiveModule()
      await refetch(true)
      toast.success('Module deleted', `${mod.course_code || mod.title} and its content have been removed.`)
    } catch (e: any) {
      toast.error('Could not delete module', e.message)
    }
  }

  const openModuleMenu = (mod: any) => {
    const archived = mod.status === 'archived'
    actionSheet.show({
      title: mod.title,
      items: [
        archived
          ? { icon: '♻️', label: 'Restore module',    onPress: () => setArchived(mod, false) }
          : { icon: '📦', label: 'Archive module',    onPress: () => setArchived(mod, true)  },
        ...(mod.owner_id === user?.id
          ? [{ icon: '🗑️', label: 'Delete module', onPress: () => deleteModule(mod) }]
          : []),
      ],
    })
  }

  const openAddMenu = () => {
    actionSheet.show({
      title: 'Add a module',
      items: [
        { icon: '🔑', label: 'Join a course with a code', onPress: openJoinSheet },
        { icon: '📚', label: 'Create my own module', onPress: openCreateSheet },
      ],
    })
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} edges={["top", "left", "right"]} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20} horizontal alignItems="center" justifyContent="space-between">
          <Stack gap={2}>
            <Text variant="overline" color={C.textSecondary}>Your learning</Text>
            <Text variant="title" color={C.textPrimary} fontWeight="800">Modules</Text>
          </Stack>
        </Stack>
      </StyledPage.Header.Full>

      <TabBar
        options={TABS} value={filter} onChange={setFilter}
        indicator="line" showBorder tabAlign="center"
        style={{ marginHorizontal: 16, marginTop: 16 }}
        colors={{
          background: C.bgCard, activeText: C.primary,
          indicator: C.primary, text: C.textSecondary, border: C.border,
        }}
      />

      <StyledScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        {loading && (
          <Stack gap={10}>
            {[1, 2, 3].map((i) => (
              <Stack key={i} height={88} backgroundColor={C.bgMuted} borderRadius={18}
                style={{ opacity: 0.4 }}
              />
            ))}
          </Stack>
        )}

        {!loading && filtered.length === 0 && (
          <Stack alignItems="center" padding={40} gap={14} marginTop={20}>
            <Stack
              width={84} height={84} borderRadius={26}
              backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
            >
              <Feather name="book-open" size={36} color={C.primary} />
            </Stack>
            <Text variant="subtitle" color={C.textPrimary} fontWeight="700" textAlign="center">
              No {filter === 'all' ? '' : filter} modules yet
            </Text>
            <Text variant="body" color={C.textSecondary} textAlign="center">
              Tap + to join a course with the code your lecturer shared, or create your own module.
            </Text>
          </Stack>
        )}

        <Stack gap={10}>
          {filtered.map((mod, idx) => {
            const mc = getModuleColors(C, idx)
            return (
              <StyledPressable
                key={mod.id}
                onPress={() => {
                  setActiveModule(mod.id, mod.title, mod.course_code)
                  router.push(`/module/${mod.id}`)
                }}
                onLongPress={() => openModuleMenu(mod)}
              >
                <StyledCard
                  backgroundColor={C.bgCard} borderRadius={18} padding={16}
                  style={{ borderWidth: 1, borderColor: C.border }}
                >
                  <Stack horizontal alignItems="center" gap={14}>
                    <Stack
                      width={56} height={56} borderRadius={16}
                      backgroundColor={mc.bg} alignItems="center" justifyContent="center"
                    >
                      <Text variant="overline" color={mc.color}
                        style={{ fontSize: 9, letterSpacing: 0.4, textAlign: 'center' }}
                      >
                        {mod.course_code || 'MOD'}
                      </Text>
                    </Stack>
                    <Stack flex={1} gap={5}>
                      <Stack horizontal alignItems="flex-start" justifyContent="space-between" gap={8}>
                        <Text variant="label" color={C.textPrimary} fontWeight="700"
                          numberOfLines={1} style={{ flex: 1 }}
                        >{mod.title}</Text>
                        <Stack
                          backgroundColor={mod.status === 'active' ? C.successBg : C.bgMuted}
                          borderRadius={8} paddingHorizontal={8} paddingVertical={3}
                        >
                          <Text variant="caption"
                            color={mod.status === 'active' ? C.success : C.textMuted}
                            fontWeight="600" style={{ fontSize: 9 }}
                          >
                            {mod.status}
                          </Text>
                        </Stack>
                      </Stack>
                      <Text variant="caption" color={C.textSecondary}>
                        {mod.document_count ?? 0} docs · {mod.student_count ?? 0} students
                      </Text>
                      <Stack height={3} backgroundColor={C.bgMuted} borderRadius={2}
                        style={{ overflow: 'hidden' }}
                      >
                        <Stack height={3} borderRadius={2} backgroundColor={mc.color} width={`${mod.progress ?? 0}%` as any} />
                      </Stack>
                    </Stack>
                    <StyledPressable
                      onPress={() => openModuleMenu(mod)} hitSlop={10}
                      width={32} height={32} borderRadius={16}
                      alignItems="center" justifyContent="center"
                    >
                      <Feather name="more-vertical" size={18} color={C.textMuted} />
                    </StyledPressable>
                  </Stack>
                </StyledCard>
              </StyledPressable>
            )
          })}
        </Stack>
      </StyledScrollView>

      {/* Add: students join with a code; everyone else creates (or joins) */}
      <StyledPressable
        onPress={openAddMenu}
        width={58} height={58} borderRadius={29}
        backgroundColor={C.primary} alignItems="center" justifyContent="center"
        style={{
          position: 'absolute', right: 20, bottom: 22,
          shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 }, elevation: 8,
        }}
      >
        <Feather name="plus" size={26} color={C.white} />
      </StyledPressable>
    </StyledPage>
  )
}
