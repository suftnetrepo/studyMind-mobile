import type { PremiumPlan } from '../services/premiumService'
import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import * as FileSystem from 'expo-file-system'

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

// ─── Reader font size — scales AI answers, notes, summaries, flashcards, etc. ──
// A multiplier (not fixed px) since it has to work across many variant sizes
// (chat body 14px, flashcard 18px, ...), not one fixed reading surface like a
// Bible verse.
export const READER_SCALE_STEPS = [0.85, 1, 1.15, 1.3, 1.45] as const
const READER_SCALE_KEY = 'studymind_reader_scale'

interface ReaderFontState {
  scale:        number
  hydrated:     boolean
  hydrate:      () => Promise<void>
  increase:     () => void
  decrease:     () => void
  reset:        () => void
}

export const useReaderFontStore = create<ReaderFontState>((set, get) => {
  const persist = (scale: number) => SecureStore.setItemAsync(READER_SCALE_KEY, String(scale)).catch(() => {})
  const step = (dir: 1 | -1) => {
    const steps = READER_SCALE_STEPS as readonly number[]
    const i = steps.indexOf(get().scale)
    const next = steps[Math.min(steps.length - 1, Math.max(0, (i === -1 ? 1 : i) + dir))]
    set({ scale: next })
    persist(next)
  }

  return {
    scale:    1,
    hydrated: false,
    hydrate: async () => {
      try {
        const stored = Number(await SecureStore.getItemAsync(READER_SCALE_KEY))
        if ((READER_SCALE_STEPS as readonly number[]).includes(stored)) set({ scale: stored, hydrated: true })
        else set({ hydrated: true })
      } catch {
        set({ hydrated: true })
      }
    },
    increase: () => step(1),
    decrease: () => step(-1),
    reset:    () => { set({ scale: 1 }); persist(1) },
  }
})

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
    created_at?:    string
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

// Keychain items survive uninstall but the documents folder does not, so a
// missing marker file means this is a fresh install: drop stale login/onboarding.
export async function ensureFreshInstall(): Promise<void> {
  try {
    const marker = `${FileSystem.documentDirectory}install-marker`
    if ((await FileSystem.getInfoAsync(marker)).exists) return
    await Promise.all([ACCESS_KEY, REFRESH_KEY, ONBOARDING_KEY].map((k) => SecureStore.deleteItemAsync(k).catch(() => {})))
    await FileSystem.writeAsStringAsync(marker, '1')
  } catch {}
}

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

// ─── Premium store ────────────────────────────────────────────────────────────
interface PremiumState {
  isPremium: boolean
  plan:      PremiumPlan
  hydrated:  boolean
  setEntitlement: (isPremium: boolean, plan: PremiumPlan) => void
}

export const usePremiumStore = create<PremiumState>((set) => ({
  isPremium: false,
  plan:      null,
  hydrated:  false,

  setEntitlement: (isPremium, plan) => set({ isPremium, plan, hydrated: true }),
}))
