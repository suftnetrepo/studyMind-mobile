import { useEffect } from 'react'
import { usePathname } from 'expo-router'
import { trackScreen } from '../services/analytics'

// Stable, human-readable screen names keyed by Expo Router pathname. Dynamic
// segments are collapsed (e.g. /notes/123 → "Note") so ids never reach analytics.
const SCREEN_NAMES: Record<string, string> = {
  '/': 'Home',
  '/modules': 'Modules',
  '/notes-tab': 'Notes',
  '/settings': 'Settings',
  '/onboarding': 'Onboarding',
  '/auth/login': 'Login',
  '/auth/register': 'Register',
  '/auth/forgot-password': 'Forgot Password',
  '/chat': 'Chat',
  '/general-chat': 'General Chat',
  '/writing-assistant': 'Writing Assistant',
  '/flashcards': 'Flashcards',
  '/flashcards/create': 'Create Flashcards',
  '/quiz': 'Quiz',
  '/quiz/create': 'Create Quiz',
  '/summary': 'Summary',
  '/summary/create': 'Create Summary',
  '/notes': 'Notes List',
  '/profile': 'Profile',
  '/help': 'Help',
  '/privacy': 'Privacy',
  '/module/create': 'Create Module',
  '/setup/student': 'Setup Student',
  '/setup/lecturer': 'Setup Lecturer',
  '/setup/self-learner': 'Setup Self Learner',
  '/setup/paste-text': 'Paste Text',
}

const SETTLE_MS = 400

const screenName = (pathname: string): string => {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  if (SCREEN_NAMES[path]) return SCREEN_NAMES[path]
  if (/^\/module\/[^/]+$/.test(path)) return 'Module'
  if (/^\/notes\/[^/]+$/.test(path)) return 'Note'
  return 'Other'
}

// Fires once per pathname change from the root layout, so individual screens
// need no analytics code.
export function useScreenTracking() {
  const pathname = usePathname()
  // Short delay so pass-through routes (e.g. the default tab shown for a frame
  // before a redirect to onboarding or login) are not counted as visits.
  useEffect(() => {
    const timer = setTimeout(() => trackScreen(screenName(pathname)), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [pathname])
}
