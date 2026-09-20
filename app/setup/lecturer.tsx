import React, { useState } from 'react'
import { Platform, KeyboardAvoidingView } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as Clipboard from 'expo-clipboard'
import {
  StyledPage, StyledScrollView, Stack, StyledCard, StyledButton, StyledForm, StyledPressable,
  useToast, useLoader,
} from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { StepDots, HeroIcon } from '../../src/components/setup'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { moduleService } from '../../src/services/api'
import { useAuthStore, useModuleStore, setSetupDone } from '../../src/stores'

type Step = 'create' | 'upload' | 'share'
const STEPS: Step[] = ['create', 'upload', 'share']

export default function LecturerSetup() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const user   = useAuthStore((s) => s.user)
  const { setActiveModule } = useModuleStore()

  const [step,       setStep]       = useState<Step>('create')
  const [title,      setTitle]      = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [moduleId,   setModuleId]   = useState<string | null>(null)
  const [enrolCode,  setEnrolCode]  = useState<string | null>(null)
  const [codeNote,   setCodeNote]   = useState<string | null>(null)

  const finish = async () => {
    if (user?.id) await setSetupDone(user.id)
    router.replace('/(tabs)')
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.warning('Enter a module name', 'Give your module a title.')
      return
    }
    const loadId = loader.show({ label: 'Creating module…', variant: 'dots' })
    try {
      const code = courseCode.trim().toUpperCase() || title.trim().replace(/\s/g, '').slice(0, 6).toUpperCase()
      const res  = await moduleService.createModule(title.trim(), code, undefined, 'class')
      setModuleId(res.id)
      setActiveModule(res.id, res.title, res.course_code)
      try {
        const c = await moduleService.createEnrolmentCode(res.id)
        setEnrolCode(c.code)
      } catch (e: any) {
        setCodeNote(e.message)
      }
      setStep('upload')
    } catch (e: any) {
      toast.error('Could not create module', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const handleUpload = async () => {
    if (!moduleId) return
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown'],
      copyToCacheDirectory: true,
      multiple: true,
    })
    if (result.canceled) return
    const loadId = loader.show({ label: 'Uploading…', variant: 'dots' })
    try {
      for (const file of result.assets) {
        await moduleService.uploadDocument(
          moduleId,
          { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' },
          'class',
        )
      }
      toast.success('Materials uploaded!', `${result.assets.length} file(s) indexed.`)
      setStep('share')
    } catch (e: any) {
      toast.error('Upload failed', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  const copyCode = async () => {
    if (!enrolCode) return
    await Clipboard.setStringAsync(enrolCode)
    toast.success('Copied!', 'Code copied to clipboard.')
  }

  const primaryShadow = {
    shadowColor: C.primary, shadowOpacity: 0.35,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 }}
        >
          <StepDots count={3} index={STEPS.indexOf(step)} />

          {step === 'create' && (
            <Stack gap={24}>
              <Stack alignItems="center" gap={12}>
                <HeroIcon name="layers" />
                <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center">Set up your module</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24 }}>
                  Create your first module. Students enrol with a code you share.
                </Text>
              </Stack>
              <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20}
                style={{ borderWidth: 1, borderColor: C.border }}
              >
                <Stack gap={16}>
                  <StyledForm.Input
                    label="Module name" placeholder="e.g. Introduction to Programming"
                    value={title} onChangeText={setTitle} colors={getFieldColors(C)}
                  />
                  <StyledForm.Input
                    label="Course code (optional)" placeholder="e.g. CSC109"
                    value={courseCode} onChangeText={(t) => setCourseCode(t.toUpperCase())}
                    autoCapitalize="characters" colors={getFieldColors(C)}
                  />
                </Stack>
              </StyledCard>
              <StyledButton backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
                onPress={handleCreate} style={primaryShadow}
              >
                <Text variant="button" color={C.white}>Create module</Text>
              </StyledButton>
              <StyledButton backgroundColor="transparent" borderRadius={16} paddingVertical={10} onPress={finish}>
                <Text variant="body" color={C.textSecondary}>Skip for now</Text>
              </StyledButton>
            </Stack>
          )}

          {step === 'upload' && (
            <Stack gap={24}>
              <Stack alignItems="center" gap={12}>
                <HeroIcon name="upload-cloud" />
                <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center">Add your course materials</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24 }}>
                  Upload lecture slides, notes or handouts. Students can then study from them with AI.
                </Text>
              </Stack>
              <StyledPressable onPress={handleUpload}>
                <Stack
                  backgroundColor={C.bgCard} borderRadius={20} padding={32} alignItems="center" gap={12}
                  style={{ borderWidth: 2, borderColor: C.primary, borderStyle: 'dashed' }}
                >
                  <Feather name="file-plus" size={36} color={C.primary} />
                  <Text variant="subtitle" color={C.primary} fontWeight="700">Upload PDFs or text files</Text>
                  <Text variant="body" color={C.textSecondary} textAlign="center">Tap to select one or more files</Text>
                </Stack>
              </StyledPressable>
              <StyledButton backgroundColor={C.bgCard} borderRadius={16} paddingVertical={14}
                borderWidth={1} borderColor={C.border} onPress={() => setStep('share')}
              >
                <Text variant="button" color={C.textSecondary}>Skip for now</Text>
              </StyledButton>
            </Stack>
          )}

          {step === 'share' && (
            <Stack gap={24}>
              <Stack alignItems="center" gap={12}>
                <HeroIcon name="check" tone="success" />
                <Text variant="header" color={C.textPrimary} fontWeight="800" textAlign="center">Module created!</Text>
                <Text variant="body" color={C.textSecondary} textAlign="center" style={{ lineHeight: 24 }}>
                  {enrolCode
                    ? 'Share this code with your students so they can enrol and use the AI study tools.'
                    : 'Your module is ready.'}
                </Text>
              </Stack>

              {enrolCode ? (
                <StyledCard backgroundColor={C.navy} borderRadius={20} padding={24} alignItems="center" gap={12}>
                  <Text variant="overline" color="rgba(255,255,255,0.5)">STUDENT ENROLMENT CODE</Text>
                  <Text style={{
                    fontSize: 30, color: '#FFFFFF', letterSpacing: 4,
                    fontFamily: 'PlusJakartaSans_800ExtraBold',
                  }}>
                    {enrolCode}
                  </Text>
                  <StyledPressable onPress={copyCode} backgroundColor="rgba(91,127,255,0.25)"
                    borderRadius={12} paddingHorizontal={16} paddingVertical={8}
                  >
                    <Stack horizontal alignItems="center" gap={6}>
                      <Feather name="copy" size={14} color="#A3BFFF" />
                      <Text variant="label" color="#A3BFFF" fontWeight="700">Copy code</Text>
                    </Stack>
                  </StyledPressable>
                </StyledCard>
              ) : (
                <Stack backgroundColor={C.warningBg} borderRadius={14} padding={16} horizontal gap={12} alignItems="flex-start">
                  <Feather name="alert-circle" size={18} color={C.warning} style={{ marginTop: 1 }} />
                  <Text variant="caption" color={C.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
                    {codeNote || 'An enrolment code could not be created.'}
                  </Text>
                </Stack>
              )}

              <StyledButton backgroundColor={C.primary} borderRadius={16} paddingVertical={16}
                onPress={finish} style={primaryShadow}
              >
                <Text variant="button" color={C.white}>Go to my module</Text>
              </StyledButton>
            </Stack>
          )}
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
