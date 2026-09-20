import React, { useState } from 'react'
import { Platform, TextInput } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import {
  StyledPage, StyledScrollView, Stack,
  StyledCard, StyledPressable, StyledButton, TabBar, type TabItem,
  useActionSheet, useToast,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { useColors, useIsDark, getModuleColors } from '../../src/constants'
import { useModuleStore, useAuthStore } from '../../src/stores'
import { useModules } from '../../src/hooks'
import { api, moduleService } from '../../src/services/api'

// ─── Join with code — small form rendered inside an action sheet ────────────
function JoinCodeForm({
  colors, submitting, onSubmit,
}: {
  colors: ReturnType<typeof useColors>
  submitting: boolean
  onSubmit: (code: string) => void
}) {
  const [code, setCode] = useState('')

  return (
    <Stack gap={12} paddingHorizontal={16} paddingBottom={4}>
      <Stack
        backgroundColor={colors.bgInput} borderRadius={14}
        borderWidth={1} borderColor={colors.border}
        paddingHorizontal={16} paddingVertical={12}
      >
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Enter enrolment code"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => code.trim() && onSubmit(code.trim())}
          style={{ color: colors.textPrimary, fontSize: 16 }}
        />
      </Stack>
      <StyledButton
        backgroundColor={code.trim() ? colors.primary : colors.bgMuted}
        borderRadius={12} paddingVertical={13}
        disabled={!code.trim() || submitting}
        loading={submitting}
        onPress={() => onSubmit(code.trim())}
      >
        <Text variant="label" color={code.trim() ? colors.white : colors.textMuted}
          fontWeight="700" textAlign="center"
        >
          Join module
        </Text>
      </StyledButton>
    </Stack>
  )
}

// ─── Create module — small form rendered inside an action sheet ─────────────
function CreateModuleForm({
  colors, submitting, onSubmit,
}: {
  colors: ReturnType<typeof useColors>
  submitting: boolean
  onSubmit: (title: string, courseCode: string) => void
}) {
  const [title, setTitle]           = useState('')
  const [courseCode, setCourseCode] = useState('')

  return (
    <Stack gap={10} paddingHorizontal={16} paddingBottom={4}>
      <Stack
        backgroundColor={colors.bgInput} borderRadius={14}
        borderWidth={1} borderColor={colors.border}
        paddingHorizontal={16} paddingVertical={12}
      >
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Module title"
          placeholderTextColor={colors.textMuted}
          autoFocus
          style={{ color: colors.textPrimary, fontSize: 16 }}
        />
      </Stack>
      <Stack
        backgroundColor={colors.bgInput} borderRadius={14}
        borderWidth={1} borderColor={colors.border}
        paddingHorizontal={16} paddingVertical={12}
      >
        <TextInput
          value={courseCode}
          onChangeText={setCourseCode}
          placeholder="Course code (optional)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={() => title.trim() && onSubmit(title.trim(), courseCode.trim())}
          style={{ color: colors.textPrimary, fontSize: 16 }}
        />
      </Stack>
      <StyledButton
        backgroundColor={title.trim() ? colors.primary : colors.bgMuted}
        borderRadius={12} paddingVertical={13}
        disabled={!title.trim() || submitting}
        loading={submitting}
        onPress={() => onSubmit(title.trim(), courseCode.trim())}
      >
        <Text variant="label" color={title.trim() ? colors.white : colors.textMuted}
          fontWeight="700" textAlign="center"
        >
          Create module
        </Text>
      </StyledButton>
    </Stack>
  )
}

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
  const { setActiveModule } = useModuleStore()
  const user = useAuthStore((s) => s.user)
  const [filter, setFilter] = useState<Filter>('all')
  const [submitting, setSubmitting] = useState(false)

  const actionSheet = useActionSheet()
  const toast        = useToast()

  const isStudent = user?.role === 'student'
  const canCreate = user?.role === 'lecturer' || user?.role === 'admin' || user?.role === 'self_learner'
  const canJoin   = user?.role === 'student'  || user?.role === 'self_learner'

  const filtered = modules.filter((m) => {
    if (filter === 'all') return true
    return m.status === filter
  })

  const openJoinSheet = () => {
    const sheetId = actionSheet.present(
      <JoinCodeForm
        colors={C}
        submitting={submitting}
        onSubmit={async (code) => {
          setSubmitting(true)
          try {
            // A code may be an institution join code (e.g. DEMO2025) or a
            // module enrolment code (e.g. CSC109) — try institution join
            // first, then fall back to module enrolment on any failure
            // (invalid code, or already a member of an institution).
            try {
              await api.post('/api/institutions/join', { code })
              actionSheet.dismiss(sheetId)
              toast.success('Joined!', 'You now have access to your institution.')
            } catch {
              await moduleService.enrolByCode(code)
              actionSheet.dismiss(sheetId)
              toast.success('Enrolled!', 'You now have access to this module.')
            }
            await refetch()
          } catch (e: any) {
            toast.error('Could not join', e.message || 'Check the code and try again.')
          } finally {
            setSubmitting(false)
          }
        }}
      />,
      { title: 'Join with code' },
    )
  }

  const openCreateSheet = () => {
    const sheetId = actionSheet.present(
      <CreateModuleForm
        colors={C}
        submitting={submitting}
        onSubmit={async (title, courseCode) => {
          setSubmitting(true)
          try {
            await moduleService.create({ title, course_code: courseCode || undefined })
            actionSheet.dismiss(sheetId)
            toast.success('Module created!', `${title} is ready.`)
            await refetch()
          } catch (e: any) {
            toast.error('Could not create module', e.message)
          } finally {
            setSubmitting(false)
          }
        }}
      />,
      { title: 'Create module' },
    )
  }

  const openAddMenu = () => {
    actionSheet.show({
      title: 'Add module',
      items: [
        ...(canCreate ? [{ icon: '📚', label: 'Create module', onPress: openCreateSheet }] : []),
        ...(canJoin   ? [{ icon: '🔑', label: 'Join with code', onPress: openJoinSheet }]  : []),
      ],
    })
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <StyledPage.Header.Full>
        <Stack marginHorizontal={20} horizontal alignItems="center" justifyContent="space-between">
          <Stack gap={2}>
            <Text variant="overline" color={C.textSecondary}>Your learning</Text>
            <Text variant="title" color={C.textPrimary} fontWeight="800">Modules</Text>
          </Stack>
          {isStudent ? (
            <StyledButton
              backgroundColor={C.primaryBg} borderRadius={12}
              paddingHorizontal={16} paddingVertical={9}
              borderWidth={1} borderColor={C.primary}
              onPress={openJoinSheet}
            >
              <Text variant="label" color={C.primary} fontWeight="700">+ Join</Text>
            </StyledButton>
          ) : (
            <StyledButton
              backgroundColor={C.primary} borderRadius={12}
              paddingHorizontal={16} paddingVertical={9}
              onPress={openAddMenu}
            >
              <Text variant="label" color={C.white} fontWeight="700">+ New</Text>
            </StyledButton>
          )}
        </Stack>
      </StyledPage.Header.Full>

      <TabBar
        options={TABS} value={filter} onChange={setFilter}
        indicator="line" showBorder tabAlign="scroll"
        style={{ marginHorizontal: 16, marginTop: 8 }}
        colors={{
          background: C.bgCard, activeText: C.primary,
          indicator: C.primary, text: C.textSecondary, border: C.border,
        }}
      />

      <StyledScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {loading && (
          <Stack gap={10} marginTop={8}>
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
              Create a module or enrol using an enrolment code from your lecturer.
            </Text>
          </Stack>
        )}

        <Stack gap={10} marginTop={8}>
          {filtered.map((mod, idx) => {
            const mc = getModuleColors(C, idx)
            return (
              <StyledPressable
                key={mod.id}
                onPress={() => {
                  setActiveModule(mod.id, mod.title, mod.course_code)
                  router.push(`/module/${mod.id}`)
                }}
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
                    <Text style={{ fontSize: 18, color: C.textMuted }}>›</Text>
                  </Stack>
                </StyledCard>
              </StyledPressable>
            )
          })}
        </Stack>
      </StyledScrollView>
    </StyledPage>
  )
}
