import { Alert } from 'react-native'
import * as FileSystem from 'expo-file-system'

// App Review guideline 5.1.2(i): tell the user where their data goes when it is
// shared with a third-party AI, and get explicit permission first. Study
// content, questions and voice input are processed by OpenAI via the Revvo
// backend. The choice is a file under the documents folder (like the analytics
// consent), so it is wiped on uninstall and a reinstall asks again.
const CONSENT_FILE = `${FileSystem.documentDirectory}ai-data-consent`

export async function hasAiConsent(): Promise<boolean> {
  try {
    return (await FileSystem.readAsStringAsync(CONSENT_FILE)).trim() === '1'
  } catch {
    return false
  }
}

export async function setAiConsent(value: boolean) {
  try {
    if (value) await FileSystem.writeAsStringAsync(CONSENT_FILE, '1')
    else await FileSystem.deleteAsync(CONSENT_FILE, { idempotent: true })
  } catch {}
}

// Resolves true once the user has agreed (now or previously), false if they decline.
export async function ensureAiConsent(): Promise<boolean> {
  if (await hasAiConsent()) return true
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'How Revvo uses AI',
      'Revvo answers your questions and creates quizzes, flashcards and summaries using OpenAI. To do this, the questions you ask, the documents and scans you add, and any voice input are sent securely to OpenAI through our servers. Revvo does not sell your data. Details are in Privacy & terms.\n\nDo you agree to this?',
      [
        { text: "Don't agree", style: 'cancel', onPress: () => resolve(false) },
        { text: 'I agree', onPress: async () => { await setAiConsent(true); resolve(true) } },
      ],
      { cancelable: false },
    )
  })
}
