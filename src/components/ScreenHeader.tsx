import React from 'react'
import { StyledPage, Stack } from 'fluent-styles'
import { Text } from './Text'
import { useColors, getBackArrowProps, getBackShapeProps } from '../constants'

interface ScreenHeaderProps {
  title:       string
  subtitle?:   string
  onBackPress: () => void
  variant?:    'compact' | 'large'
  rightIcon?:  React.ReactNode
  fontSize?:   number
  marginTop?:  number
}

export function ScreenHeader({
  title, subtitle, onBackPress,
  variant = 'compact', rightIcon, fontSize = 17, marginTop = 0,
}: ScreenHeaderProps) {
  const C = useColors()

  if (variant === 'large') {
    return (
      <StyledPage.Header
        backgroundColor={C.bg}
        marginHorizontal={16}
        marginTop={marginTop}
        showBackArrow
        backArrowProps={getBackArrowProps(C)}
        shapeProps={getBackShapeProps(C, 48)}
        onBackPress={onBackPress}
        title=" "
        titleAlignment="left"
        leftIcon={
          <Stack paddingHorizontal={16} gap={2}>
            <Text variant="header" color={C.textPrimary}>{title}</Text>
            {subtitle && <Text variant="bodySmall" color={C.textSecondary}>{subtitle}</Text>}
          </Stack>
        }
        rightIcon={rightIcon}
      />
    )
  }

  return (
    <StyledPage.Header
      backgroundColor={C.bg}
      marginHorizontal={16}
      marginTop={marginTop}
      showBackArrow
      backArrowProps={getBackArrowProps(C)}
      shapeProps={getBackShapeProps(C, 48)}
      onBackPress={onBackPress}
      title={title}
      titleAlignment="center"
      titleProps={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize, color: C.textPrimary }}
      rightIcon={rightIcon}
      subtitle={subtitle}
      subtitleProps={{ fontSize: 12, color: C.textSecondary, fontFamily: 'PlusJakartaSans_400Regular' }}
    />
  )
}
