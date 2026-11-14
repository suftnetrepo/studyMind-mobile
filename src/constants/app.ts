import Constants from 'expo-constants'

// App-wide links. Revvo's live policy pages are hosted on GitHub Pages.
export const SUPPORT_EMAIL = 'abel.aghorighor@suftnet.com'
export const PRIVACY_POLICY_URL = 'https://suftnetrepo.github.io/revvo-ios/'
export const TERMS_URL          = 'https://suftnetrepo.github.io/revvo-ios/terms.html'
export const SUPPORT_URL        = 'https://suftnetrepo.github.io/revvo-ios/support.html'
// Read from app.json so Settings and support emails always show the shipped version.
export const APP_VERSION        = Constants.expoConfig?.version ?? '1.0.0'
