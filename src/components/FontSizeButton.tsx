import React from 'react'
import { Feather } from '@expo/vector-icons'
import { StyledPressable } from 'fluent-styles'
import { useColors } from '../constants'

// Header icon that opens <FontSizePopup>. Shared across every reading screen
// (chat, notes, quiz, flashcards, summary, writing assistant) for one
// consistent way to reach the text-size control.
export function FontSizeButton({ onPress }: { onPress: () => void }) {
  const C = useColors()
  return (
    <StyledPressable
      width={38} height={38} borderRadius={11}
      backgroundColor={C.bgMuted}
      alignItems="center" justifyContent="center"
      onPress={onPress}
      accessibilityLabel="Text size"
    >
      <Feather name="type" size={18} color={C.textPrimary} />
    </StyledPressable>
  )
}
