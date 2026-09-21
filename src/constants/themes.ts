// ─── Revvo theme palettes ─────────────────────────────────────────────
// Both palettes share the same keys — useColors() returns the right one
// automatically based on the user's system or explicit preference.

export const LightColors = {
  // Brand
  primary:      '#5B7FFF',
  primaryDark:  '#3D5CE8',
  primaryLight: '#8BA4FF',
  primaryBg:    '#EEF2FF',

  // Feature accent colours
  quizColor:    '#8B5CF6',  quizBg:    '#F5F3FF',
  flashColor:   '#14B8A6',  flashBg:   '#F0FDFA',
  sumColor:     '#F59E0B',  sumBg:     '#FFFBEB',
  chatColor:    '#5B7FFF',  chatBg:    '#EEF2FF',

  // Module pill colours (deterministic per index)
  mod0: '#5B7FFF',  mod0Bg: '#EEF2FF',
  mod1: '#8B5CF6',  mod1Bg: '#F5F3FF',
  mod2: '#14B8A6',  mod2Bg: '#F0FDFA',
  mod3: '#F59E0B',  mod3Bg: '#FFFBEB',
  mod4: '#E8470A',  mod4Bg: '#FEF0EB',

  // Backgrounds
  bg:      '#F5F6FA',
  bgCard:  '#FFFFFF',
  bgInput: '#F0F1F7',
  bgMuted: '#E8EAF4',

  // Text
  textPrimary:   '#0F1117',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  textOnDark:    '#FFFFFF',

  // Status
  success:   '#27500A',  successBg: '#EAF3DE',
  error:     '#791F1F',  errorBg:   '#FCEBEB',
  warning:   '#854F0B',  warningBg: '#FAEEDA',

  // Misc
  border:      '#E5E7EB',
  borderFocus: '#5B7FFF',
  white:       '#FFFFFF',
  black:       '#0F1117',
  navy:        '#1A1B2E',
  navyLight:   '#2D2E4A',
}

export const DarkColors: typeof LightColors = {
  primary:      '#7B9FFF',
  primaryDark:  '#5B7FFF',
  primaryLight: '#A3BFFF',
  primaryBg:    'rgba(91,127,255,0.18)',

  quizColor:  '#A78BFA', quizBg:  'rgba(139,92,246,0.16)',
  flashColor: '#2DD4BF', flashBg: 'rgba(20,184,166,0.16)',
  sumColor:   '#FCD34D', sumBg:   'rgba(245,158,11,0.16)',
  chatColor:  '#7B9FFF', chatBg:  'rgba(91,127,255,0.18)',

  mod0: '#7B9FFF',  mod0Bg: 'rgba(91,127,255,0.18)',
  mod1: '#A78BFA',  mod1Bg: 'rgba(139,92,246,0.16)',
  mod2: '#2DD4BF',  mod2Bg: 'rgba(20,184,166,0.16)',
  mod3: '#FCD34D',  mod3Bg: 'rgba(245,158,11,0.16)',
  mod4: '#FF6B3D',  mod4Bg: 'rgba(255,107,61,0.16)',

  bg:      '#0F1015',
  bgCard:  '#1A1B25',
  bgInput: '#22232F',
  bgMuted: '#2A2B38',

  textPrimary:   '#F3F4F8',
  textSecondary: '#9EA3B5',
  textMuted:     '#6B7080',
  textOnDark:    '#FFFFFF',

  success:   '#78D65E', successBg: 'rgba(120,214,94,0.14)',
  error:     '#F1726F', errorBg:   'rgba(241,114,111,0.14)',
  warning:   '#F0B255', warningBg: 'rgba(240,178,85,0.14)',

  border:      '#2A2B3A',
  borderFocus: '#7B9FFF',
  white:       '#FFFFFF',
  black:       '#0F1015',
  navy:        '#0D0E1A',
  navyLight:   '#1A1B2E',
}

export type ThemeColors = typeof LightColors
