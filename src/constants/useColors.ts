import { useColorScheme } from 'react-native'
import { useThemeStore } from '../stores'
import { LightColors, DarkColors, type ThemeColors } from './themes'

export const useColors = (): ThemeColors => {
  const mode   = useThemeStore((s) => s.mode)
  const system = useColorScheme()
  const resolved = mode === 'system' ? (system ?? 'light') : mode
  return resolved === 'dark' ? DarkColors : LightColors
}

export const getColors = (): ThemeColors => {
  const mode = useThemeStore.getState().mode
  return mode === 'dark' ? DarkColors : LightColors
}

export const useIsDark = (): boolean => {
  const mode   = useThemeStore((s) => s.mode)
  const system = useColorScheme()
  const resolved = mode === 'system' ? (system ?? 'light') : mode
  return resolved === 'dark'
}
