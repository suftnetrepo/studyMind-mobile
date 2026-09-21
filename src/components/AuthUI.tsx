import React from 'react'
import { ActivityIndicator, StyleSheet } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg'
import { Feather } from '@expo/vector-icons'
import { Stack, StyledPressable } from 'fluent-styles'
import { Text } from './Text'
import { useColors } from '../constants'

// Soft decorative circles behind the auth screens.
export function AuthBackground() {
  const C = useColors()
  return (
    <Stack style={StyleSheet.absoluteFill} pointerEvents="none">
      <Stack position="absolute" top={-90} left={-110} width={300} height={300} borderRadius={150}
        backgroundColor={C.primaryBg} style={{ opacity: 0.9 }} />
      <Stack position="absolute" top={40} right={-140} width={320} height={320} borderRadius={160}
        backgroundColor={C.primaryBg} style={{ opacity: 0.55 }} />
    </Stack>
  )
}

export function BrandMark({ title, subtitle }: { title?: string; subtitle?: string }) {
  const C = useColors()
  return (
    <Stack alignItems="center" gap={14}>
      <Stack
        width={92} height={92} borderRadius={28} alignItems="center" justifyContent="center"
        backgroundColor={C.bgCard}
        style={{
          borderWidth: 1, borderColor: `${C.primary}30`,
          shadowColor: C.primary, shadowOpacity: 0.28, shadowRadius: 22,
          shadowOffset: { width: 0, height: 10 }, elevation: 10,
        }}
      >
        <Svg width={74} height={74} viewBox="0 0 74 74" preserveAspectRatio="xMidYMid meet">
          <Defs>
            <LinearGradient id="brand-mark-gradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#7CC6FF" />
              <Stop offset="0.35" stopColor="#7D8CFF" />
              <Stop offset="0.7" stopColor="#B774FF" />
              <Stop offset="1" stopColor="#F3D07B" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="74" height="74" rx="24" fill={C.bgCard} />
          <Path
            d="M12 57V19H20L36.5 41.2L53 19H61V57H53V31.7L40.2 48.9H32.8L20 31.7V57H12Z"
            fill="url(#brand-mark-gradient)"
          />
          <Path
            d="M12 57V19H20L36.5 41.2L53 19H61V57H53V31.7L40.2 48.9H32.8L20 31.7V57H12Z"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1.5}
          />
        </Svg>
      </Stack>
      {(title || subtitle) && (
        <Stack alignItems="center" gap={4}>
          {!!title && <Text variant="header" color={C.textPrimary} fontWeight="800">{title}</Text>}
          {!!subtitle && <Text variant="body" color={C.textSecondary}>{subtitle}</Text>}
        </Stack>
      )}
    </Stack>
  )
}

export function GradientButton({ label, onPress, loading, disabled, arrow = true }: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean; arrow?: boolean
}) {
  const C = useColors()
  const inactive = disabled || loading
  return (
    <StyledPressable
      onPress={onPress} disabled={inactive}
      style={{
        height: 54, borderRadius: 16, overflow: 'hidden', justifyContent: 'center',
        opacity: disabled ? 0.55 : 1,
        shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 }, elevation: 8,
      }}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="auth-btn" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#6C8DFF" />
            <Stop offset="1" stopColor={C.primary} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#auth-btn)" />
      </Svg>
      <Stack horizontal alignItems="center" justifyContent="center" paddingHorizontal={20}>
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text variant="button" color="#FFFFFF">{label}</Text>}
        {arrow && !loading && (
          <Stack position="absolute" right={20}>
            <Feather name="arrow-right" size={20} color="#FFFFFF" />
          </Stack>
        )}
      </Stack>
    </StyledPressable>
  )
}

export function OrDivider() {
  const C = useColors()
  return (
    <Stack horizontal alignItems="center" gap={14} marginVertical={22}>
      <Stack flex={1} height={1} backgroundColor={C.border} />
      <Text variant="caption" color={C.textSecondary} fontWeight="600">OR</Text>
      <Stack flex={1} height={1} backgroundColor={C.border} />
    </Stack>
  )
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function EyeToggle({ shown, onPress }: { shown: boolean; onPress: () => void }) {
  const C = useColors()
  return (
    <StyledPressable onPress={onPress} hitSlop={10} style={{ paddingHorizontal: 6 }}>
      <Feather name={shown ? 'eye-off' : 'eye'} size={18} color={C.textSecondary} />
    </StyledPressable>
  )
}
