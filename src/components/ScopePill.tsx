import React from 'react'
import { Stack, StyledPressable } from 'fluent-styles'
import { Text } from './Text'
import { useColors } from '../constants'

interface ScopePillProps {
  description: string
  onPress?:    () => void
}

export function ScopePill({ description, onPress }: ScopePillProps) {
  const C = useColors()
  return (
    <StyledPressable onPress={onPress} disabled={!onPress}>
      <Stack
        horizontal alignItems="center" gap={6}
        backgroundColor={C.primaryBg}
        borderWidth={1} borderColor={`${C.primary}33`}
        borderRadius={20} paddingHorizontal={12} paddingVertical={5}
        style={{ alignSelf: 'flex-start' }}
      >
        <Stack
          width={7} height={7} borderRadius={4}
          backgroundColor={C.primary}
        />
        <Text variant="caption" color={C.primary} fontWeight="600">
          {description}
        </Text>
        {onPress && (
          <Text variant="caption" color={C.primary} style={{ marginLeft: 2 }}>▾</Text>
        )}
      </Stack>
    </StyledPressable>
  )
}
