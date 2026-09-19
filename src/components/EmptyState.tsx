import React from 'react'
import { Stack, StyledCard, StyledButton } from 'fluent-styles'
import { Feather } from '@expo/vector-icons'
import { Text } from './Text'
import { useColors } from '../constants'

interface EmptyStateProps {
  icon:      keyof typeof Feather.glyphMap
  title:     string
  subtitle?: string
  action?:   { label: string; onPress: () => void }
  style?:    { marginTop?: number }
}

export function EmptyState({ icon, title, subtitle, action, style }: EmptyStateProps) {
  const C = useColors()
  return (
    <StyledCard backgroundColor={C.bgCard} borderRadius={16} padding={32} marginTop={style?.marginTop ?? 8}>
      <Stack alignItems="center" gap={10}>
        <Stack
          width={76} height={76} borderRadius={23}
          backgroundColor={C.primaryBg} alignItems="center" justifyContent="center"
          marginBottom={4}
        >
          <Feather name={icon} size={32} color={C.primary} />
        </Stack>
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
