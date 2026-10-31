import { Alert } from 'react-native'
import * as FileSystem from 'expo-file-system'
import { getAnalytics, logEvent, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics'

// Product analytics (Firebase / Google Analytics). Everything here is
// best-effort: analytics must never throw, block navigation, or delay a user
// action, so every call is fire-and-forget and failures are swallowed. Never
// pass document text, quiz answers, names or emails as params — only coarse
// enums and counts.

// Opt-in: nothing is collected until the user has said yes. The native side
// starts with collection off (firebase.json), and this module only turns it on
// after a stored "yes". The choice lives in a file under the documents folder
// rather than the Keychain, so it is wiped on uninstall and a reinstall asks again.
const CONSENT_FILE = `${FileSystem.documentDirectory}analytics-consent`

export type AnalyticsEvent =
  | { name: 'scan_started' }
  | { name: 'scan_completed'; params: { pages: number } }
  | { name: 'flashcard_created'; params: { cards: number } }
  | { name: 'flashcard_study_started' }
  | { name: 'quiz_started' }
  | { name: 'quiz_completed'; params: { questions: number } }
  | { name: 'subscription_viewed'; params: { source: string } }
  | { name: 'subscription_purchase_started'; params: { plan: string } }
  | { name: 'subscription_purchased'; params: { plan: string } }
  | { name: 'study_session_completed'; params: { type: 'quiz' | 'flashcards' } }

let enabled = false
let decided = false
let lastScreen: string | null = null // last screen_view actually sent
let currentScreen: string | null = null // screen on display, sent or not

// Resolves once the stored choice has been applied, so events fired during
// startup are neither lost nor sent against the user's wishes.
const ready: Promise<void> = (async () => {
  try {
    const stored = (await FileSystem.readAsStringAsync(CONSENT_FILE)).trim()
    decided = stored === '1' || stored === '0'
    enabled = stored === '1'
  } catch {}
  try {
    await setAnalyticsCollectionEnabled(getAnalytics(), enabled)
  } catch {}
})()

export function isAnalyticsEnabled() {
  return enabled
}

export async function setAnalyticsEnabled(value: boolean) {
  await ready
  enabled = value
  decided = true
  try { await FileSystem.writeAsStringAsync(CONSENT_FILE, value ? '1' : '0') } catch {}
  try { await setAnalyticsCollectionEnabled(getAnalytics(), value) } catch {}
  // Screens visited before consent were not recorded: report the current one now.
  if (value && currentScreen) {
    lastScreen = null
    trackScreen(currentScreen)
  }
  if (!value) lastScreen = null
}

// Asks once, on first launch (or after a reinstall). Does nothing when the
// user has already chosen. Never throws.
export async function askAnalyticsConsent() {
  try {
    await ready
    if (decided) return
    Alert.alert(
      'Help improve Revvo?',
      'Share anonymous usage data (which screens and features are used) so we can improve the app. Your study material, answers and personal details are never included. You can change this any time in Privacy & terms.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => { setAnalyticsEnabled(false) } },
        { text: 'Allow', onPress: () => { setAnalyticsEnabled(true) } },
      ],
      { cancelable: false },
    )
  } catch {}
}

export function trackEvent(event: AnalyticsEvent) {
  ready
    .then(() => {
      if (!enabled) return
      const params = 'params' in event ? event.params : undefined
      return logEvent(getAnalytics(), event.name, params)
    })
    .catch(() => {})
}

// Logs a screen_view; consecutive repeats of the same screen are dropped.
// GA4 derives per-screen engagement time from the gap between screen_views.
export function trackScreen(screenName: string) {
  currentScreen = screenName
  if (screenName === lastScreen) return
  lastScreen = screenName
  ready
    .then(() => {
      if (!enabled) return
      return logEvent(getAnalytics(), 'screen_view', { screen_name: screenName, screen_class: screenName })
    })
    .catch(() => {})
}
