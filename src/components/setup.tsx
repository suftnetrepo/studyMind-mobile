import React from 'react'
import { Feather } from '@expo/vector-icons'
import { Stack } from 'fluent-styles'
import { useColors } from '../constants'

export function StepDots({ count, index }: { count: number; index: number }) {
  const C = useColors()
  return (
    <Stack horizontal gap={8} justifyContent="center" marginBottom={36}>
      {Array.from({ length: count }).map((_, i) => (
        <Stack
          key={i} width={i === index ? 24 : 8} height={8} borderRadius={4}
          backgroundColor={i <= index ? C.primary : C.bgMuted}
        />
      ))}
    </Stack>
  )
}

export function HeroIcon({ name, size = 80, tone = 'primary' }: {
  name: keyof typeof Feather.glyphMap; size?: number; tone?: 'primary' | 'success' | 'navy'
}) {
  const C  = useColors()
  const bg = tone === 'success' ? C.successBg : tone === 'navy' ? C.navy : C.primaryBg
  const fg = tone === 'success' ? C.success  : tone === 'navy' ? '#FFFFFF' : C.primary
  return (
    <Stack
      width={size} height={size} borderRadius={size * 0.3}
      backgroundColor={bg} alignItems="center" justifyContent="center"
      style={{
        shadowColor: fg, shadowOpacity: 0.18, shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 }, elevation: 6,
      }}
    >
      <Feather name={name} size={size * 0.44} color={fg} />
    </Stack>
  )
}
