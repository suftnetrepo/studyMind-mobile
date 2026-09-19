import React from 'react'
import { Stack, StyledCard, StyledButton } from 'fluent-styles'
import { Text } from './Text'
import { useColors } from '../constants'

interface EmptyStateProps {
  emoji:     string
  title:     string
  subtitle?: string
  action?:   { label: string; onPress: () => void }
  style?:    { marginTop?: number }
}

export function EmptyState({ emoji, title, subtitle, action, style }: EmptyStateProps) {
  const C = useColors()
  return (
    <StyledCard backgroundColor={C.bgCard} borderRadius={16} padding={32} marginTop={style?.marginTop ?? 8}>
      <Stack alignItems="center" gap={10}>
        <Text style={{ fontSize: 40 }}>{emoji}</Text>
        <Text variant="subtitle" color={C.textPrimary} fontWeight="700" textAlign="center">{title}</Text>
        {subtitle && (
          <Text variant="body" color={C.textSecondary} textAlign="center">{subtitle}</Text>
        )}
        {action && (
          <StyledButton
            backgroundColor={C.primary} borderRadius={12}
            paddingHorizontal={24} paddingVertical={12}
            onPress={action.onPress}
            style={{ marginTop: 8 }}
          >
            <Text variant="button" color={C.white}>{action.label}</Text>
          </StyledButton>
        )}
      </Stack>
    </StyledCard>
  )
}
