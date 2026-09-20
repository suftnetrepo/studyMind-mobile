import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

// ─── Theme store — matches nailbid pattern exactly ────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'studymind_theme_mode'

interface ThemeState {
  mode:     ThemeMode
  hydrated: boolean
  setMode:  (mode: ThemeMode) => void
  hydrate:  () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode:     'system',
  hydrated: false,

  setMode: (mode) => {
    set({ mode })
    SecureStore.setItemAsync(THEME_KEY, mode).catch(() => {})
  },

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(THEME_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ mode: stored, hydrated: true })
      } else {
        set({ hydrated: true })
      }
    } catch {
      set({ hydrated: true })
    }
  },
}))

// ─── Auth store ───────────────────────────────────────────────────────────────
const ACCESS_KEY  = 'studymind_access_token'
const REFRESH_KEY = 'studymind_refresh_token'

interface AuthState {
  accessToken:  string | null
  refreshToken: string | null
  hydrated:     boolean
  user: {
    id:             string
    email:          string
    full_name:      string
    role:           'admin' | 'lecturer' | 'student' | 'self_learner'
    institution_id: string | null
  } | null
  setTokens: (access: string, refresh: string) => void
  setUser:   (user: AuthState['user']) => void
  logout:    () => void
  hydrate:   () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken:  null,
  refreshToken: null,
  hydrated:     false,
  user:         null,

  setTokens: (access, refresh) => {
    set({ accessToken: access, refreshToken: refresh })
    SecureStore.setItemAsync(ACCESS_KEY, access).catch(() => {})
    SecureStore.setItemAsync(REFRESH_KEY, refresh).catch(() => {})
  },

  setUser: (user) => set({ user }),

  logout: () => {
    set({ accessToken: null, refreshToken: null, user: null })
    SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {})
    SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {})
  },

  hydrate: async () => {
    try {
      const [access, refresh] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ])
      set({ accessToken: access, refreshToken: refresh, hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
}))

// ─── Onboarding ─────────────────────────────────────────────────────────────
// Plain SecureStore helpers, not a Zustand store — read once at bootstrap
// (before the app decides its initial route) and written once when
// onboarding finishes, with no other screen needing to subscribe to it.
const ONBOARDING_KEY = 'studymind_onboarding_seen'

export async function getOnboardingSeen(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === '1'
  } catch {
    return false
  }
}

export async function setOnboardingSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, '1')
  } catch {}
}

// Per-user flag: role setup was finished or skipped, so don't nag again.
const setupKey = (userId: string) => `studymind_setup_done_${userId}`

export async function getSetupDone(userId: string): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(setupKey(userId))) === '1'
  } catch {
    return false
  }
}

export async function setSetupDone(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(setupKey(userId), '1')
  } catch {}
}

// ─── Active module store ──────────────────────────────────────────────────────
interface ModuleState {
  activeModuleId:    string | null
  activeModuleTitle: string | null
  activeCourseCode:  string | null
  setActiveModule:   (id: string, title: string, code: string | null) => void
  clearActiveModule: () => void
}

export const useModuleStore = create<ModuleState>((set) => ({
  activeModuleId:    null,
  activeModuleTitle: null,
  activeCourseCode:  null,
  setActiveModule:   (id, title, code) => set({
    activeModuleId: id, activeModuleTitle: title, activeCourseCode: code,
  }),
  clearActiveModule: () => set({
    activeModuleId: null, activeModuleTitle: null, activeCourseCode: null,
  }),
}))
