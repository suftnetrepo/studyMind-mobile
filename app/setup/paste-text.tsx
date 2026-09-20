import React, { useState } from 'react'
import { Platform, TextInput, KeyboardAvoidingView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { StyledPage, StyledScrollView, Stack, StyledCard, StyledButton, StyledForm, useToast, useLoader } from 'fluent-styles'
import { Text } from '../../src/components/Text'
import { ScreenHeader } from '../../src/components/ScreenHeader'
import { useColors, useIsDark, getFieldColors } from '../../src/constants'
import { moduleService } from '../../src/services/api'

const MAX_CHARS = 50000
const MIN_CHARS = 10

export default function PasteTextScreen() {
  const C      = useColors()
  const isDark = useIsDark()
  const toast  = useToast()
  const loader = useLoader()
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>()

  const [title,   setTitle]   = useState('')
  const [content, setContent] = useState('')

  const handleSave = async () => {
    if (!title.trim() || content.trim().length < MIN_CHARS) {
      toast.warning('Add a title and some text', `Paste at least ${MIN_CHARS} characters.`)
      return
    }
    if (!moduleId) return
    const loadId = loader.show({ label: 'Indexing text…', variant: 'dots' })
    try {
      await moduleService.pasteText(moduleId, title.trim(), content.trim(), 'class')
      toast.success('Text indexed!', 'Your content is ready to use with AI.')
      router.back()
    } catch (e: any) {
      toast.error('Failed to save', e.message)
    } finally {
      loader.hide(loadId)
    }
  }

  return (
    <StyledPage flex={1} backgroundColor={C.bg} showStatusBar
      statusBarStyle={isDark ? 'light-content' : 'dark-content'}
      statusBarBackgroundColor={Platform.OS === 'android' ? C.bg : undefined}
    >
      <ScreenHeader title="Paste text" subtitle="Add notes, an article or a transcript" onBackPress={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StyledScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20} marginBottom={16}
            style={{ borderWidth: 1, borderColor: C.border }}
          >
            <StyledForm.Input
              label="Title" placeholder="e.g. Week 3 lecture notes"
              value={title} onChangeText={setTitle} colors={getFieldColors(C)}
            />
          </StyledCard>

          <StyledCard backgroundColor={C.bgCard} borderRadius={20} padding={20} marginBottom={16}
            style={{ borderWidth: 1, borderColor: C.border, minHeight: 300 }}
          >
            <Text variant="label" color={C.textSecondary} fontWeight="600" style={{ marginBottom: 10 }}>Content</Text>
            <TextInput
              value={content} onChangeText={setContent} maxLength={MAX_CHARS} multiline
              placeholder="Paste your text here: an article, notes, a transcript, anything you want to study from…"
              placeholderTextColor={C.textMuted}
              style={{
                color: C.textPrimary, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular',
                lineHeight: 22, minHeight: 250, textAlignVertical: 'top',
              }}
            />
            <Stack alignItems="flex-end" marginTop={8}>
              <Text variant="caption" color={C.textMuted}>
                {content.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
              </Text>
            </Stack>
          </StyledCard>

          <StyledButton backgroundColor={C.primary} borderRadius={16} paddingVertical={16} onPress={handleSave}>
            <Text variant="button" color={C.white}>Save and index</Text>
          </StyledButton>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledPage>
  )
}
