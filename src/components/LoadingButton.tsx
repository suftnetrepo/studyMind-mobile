import React from 'react'
import { ActivityIndicator } from 'react-native'
import { StyledButton, type StyledButtonProps } from 'fluent-styles'
import { Text, type TextVariant } from './Text'

// StyledButton's own `loading` prop marks it `disabled`, which triggers a
// variant that overrides backgroundColor to a near-white gray — the (white)
// spinner then has no contrast against it, so the button just looks like it
// went flat gray with no visible progress. This avoids passing
// `loading`/`disabled` to StyledButton at all: it swaps the label for a
// spinner directly and blocks the press in JS instead, so the button keeps
// its real (colored) background and the spinner is actually visible.
interface LoadingButtonProps extends Omit<StyledButtonProps, 'loading' | 'disabled' | 'onPress' | 'children'> {
  loading: boolean
  label: string
  spinnerColor?: string
  textVariant?: TextVariant
  fontWeight?: React.ComponentProps<typeof Text>['fontWeight']
  onPress: () => void
}

export function LoadingButton({
  loading, label, spinnerColor = '#FFFFFF', textVariant = 'button', fontWeight, onPress, ...rest
}: LoadingButtonProps) {
  return (
    <StyledButton {...rest} onPress={loading ? undefined : onPress}>
      {loading
        ? <ActivityIndicator color={spinnerColor} />
        : <Text variant={textVariant} color={spinnerColor} fontWeight={fontWeight}>{label}</Text>}
    </StyledButton>
  )
}
