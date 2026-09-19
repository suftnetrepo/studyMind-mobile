import { styled, StyledText, StyledTextProps } from 'fluent-styles'

type TextVariant =
  | 'display' | 'header' | 'title' | 'subtitle'
  | 'body' | 'bodySmall' | 'label' | 'subLabel'
  | 'caption' | 'button' | 'metric' | 'overline' | 'amount'

type AppTextProps = StyledTextProps & { variant?: TextVariant }

const resolveFontFamily = (weight?: string | number) => {
  const v = String(weight || '400')
  if (v === '800') return 'PlusJakartaSans_800ExtraBold'
  if (v === '700' || v === 'bold') return 'PlusJakartaSans_700Bold'
  if (v === '600') return 'PlusJakartaSans_600SemiBold'
  if (v === '500') return 'PlusJakartaSans_500Medium'
  return 'PlusJakartaSans_400Regular'
}

const TEXT_VARIANTS: Record<TextVariant, any> = {
  display:   { fontSize: 32, fontWeight: '800', lineHeight: 40 },
  header:    { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  title:     { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  subtitle:  { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  body:      { fontSize: 14, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
  label:     { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  subLabel:  { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  caption:   { fontSize: 11, fontWeight: '400', lineHeight: 16 },
  button:    { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  metric:    { fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -0.5 },
  overline:  { fontSize: 11, fontWeight: '700', lineHeight: 16, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  amount:    { fontSize: 34, fontWeight: '800', lineHeight: 40, letterSpacing: -1 },
}

const Text = styled<AppTextProps>(StyledText, {
  base: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize:   14,
    fontWeight: '400',
    lineHeight: 22,
  },
  variants: {
    variant: (selected: string, options: AppTextProps) => {
      const v = (selected || 'body') as TextVariant
      const style = TEXT_VARIANTS[v] || TEXT_VARIANTS.body
      const weight = String(options.fontWeight || style.fontWeight || '400')
      return { ...style, fontFamily: resolveFontFamily(weight) }
    },
    fontWeight: (selected: string, options: AppTextProps) => {
      const v = (options.variant as TextVariant) || 'body'
      const weight = String(selected || TEXT_VARIANTS[v]?.fontWeight || '400')
      return { fontWeight: weight as any, fontFamily: resolveFontFamily(weight) }
    },
    fontFamily: (selected: string) => selected ? { fontFamily: selected } : {},
  },
})

export { Text }
export type { AppTextProps, TextVariant }
