import React from 'react'
import { Popup, Stack, StyledPressable } from 'fluent-styles'
import { Text } from './Text'
import { useColors } from '../constants'
import { useReaderFontStore } from '../stores'

// "A-  Aa  A+" text-size control, shared by every screen with AI answers,
// notes, summaries, flashcards or quiz questions — one global preference
// (useReaderFontStore) rather than a separate one per screen.
export function FontSizePopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const C = useColors()
  const { scale, increase, decrease, reset } = useReaderFontStore()
  const canDecrease = scale > 0.85
  const canIncrease = scale < 1.45

  return (
    <Popup visible={visible} onClose={onClose} title="Text Size" showClose safeAreaBottom>
      <Stack horizontal alignItems="center" justifyContent="center" gap={18} paddingHorizontal={24} paddingVertical={26}>
        <SizeButton label="A-" disabled={!canDecrease} onPress={decrease} C={C} />
        <StyledPressable
          onPress={reset}
          alignItems="center" justifyContent="center"
          width={76} height={76} borderRadius={20}
          backgroundColor={C.primaryBg}
          accessibilityRole="button"
          accessibilityLabel="Reset text size to default"
        >
          <Text style={{ fontSize: 22 * scale }} fontWeight="800" color={C.primary}>Aa</Text>
        </StyledPressable>
        <SizeButton label="A+" disabled={!canIncrease} onPress={increase} C={C} />
      </Stack>
    </Popup>
  )
}

function SizeButton({ label, disabled, onPress, C }: { label: string; disabled: boolean; onPress: () => void; C: any }) {
  return (
    <StyledPressable
      onPress={disabled ? undefined : onPress}
      width={56} height={56} borderRadius={16}
      alignItems="center" justifyContent="center"
      backgroundColor={disabled ? C.bgMuted : C.bgCard}
      style={{ borderWidth: 1, borderColor: C.border }}
      accessibilityRole="button"
      accessibilityLabel={label === 'A-' ? 'Decrease text size' : 'Increase text size'}
      accessibilityState={{ disabled }}
    >
      <Text style={{ fontSize: label === 'A-' ? 15 : 21 }} fontWeight="800"
        color={disabled ? C.textMuted : C.textPrimary}
      >
        {label}
      </Text>
    </StyledPressable>
  )
}
