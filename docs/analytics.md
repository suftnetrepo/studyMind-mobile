# Revvo analytics (Firebase / Google Analytics 4)

## Code map
- `src/services/analytics.ts` – consent-gated, never-throwing wrapper (`trackEvent`, `trackScreen`, `setAnalyticsEnabled`) and the typed event list.
- `src/hooks/useScreenTracking.ts` – called once in `app/_layout.tsx`; maps Expo Router pathnames to fixed screen names. A 400 ms settle delay skips pass-through routes (e.g. the tab redirect), so screens shown for less than that are not counted.
- `app.config.js` – wraps `app.json`; adds the Firebase plugin, `useFrameworks: static` and `plugins/withFirebaseNoAdId.js` only when the config files exist.
- `firebase.json` – disables ad-ID collection and ad personalisation signals; auto screen reporting is off (we log `screen_view` ourselves).

## Firebase Console setup (you)
1. Create a Firebase project (or one per environment) with Google Analytics enabled.
2. Add an iOS app `com.suftnet.revvo` and an Android app `com.suftnet.revvo`.
3. Download `GoogleService-Info.plist` and `google-services.json` into `firebase/<env>/` (`firebase/production/` by default; `APP_ENV=development` selects `firebase/development/`). The folder is gitignored.
4. Android: add the SHA-1/SHA-256 of `credentials/revvo-release.keystore` to the Android app (not required for Analytics, needed for other Firebase products).
5. Rebuild natively: `npx expo prebuild --clean` (iOS then `pod install`) – JS-only reload is not enough.
6. Admin → Data Settings → Data Retention: set event data to 14 months.
7. Admin → Events: mark `subscription_purchased` as a key event.
8. Admin → Custom definitions: register event params you want in reports: `plan`, `source`, `type`, `pages`, `cards`, `questions`.

## Screens (`screen_name`)
Home, Modules, Notes, Settings, Onboarding, Login, Register, Forgot Password, Chat, General Chat, Writing Assistant, Flashcards, Create Flashcards, Quiz, Create Quiz, Summary, Create Summary, Notes List, Subscription, Profile, Help, Privacy, Create Module, Module, Note, Setup Student/Lecturer/Self Learner, Paste Text. Anything else → `Other`.

## Events
| Event | Fires | Params |
|---|---|---|
| `scan_started` | document scanner opened (`useDocumentScan`) | – |
| `scan_completed` | OCR returned text | `pages` |
| `flashcard_created` | deck generated (create screen) | `cards` |
| `flashcard_study_started` | a deck is opened | – |
| `quiz_started` | a new (unanswered) quiz is opened; resuming does not count | – |
| `quiz_completed` | server accepted the submission | `questions` |
| `subscription_viewed` | paywall opened by a self-learner | `source` |
| `subscription_purchase_started` | purchase tapped (re-entrant taps ignored) | `plan` |
| `subscription_purchased` | entitlement confirmed active (not on cancel/pending/failure) | `plan` |
| `study_session_completed` | quiz submitted, or last flashcard rated | `type` |

No user id, email, content or answers are sent.

## Consent
Opt-in. Native collection is off at launch (`firebase.json` → `FIREBASE_ANALYTICS_COLLECTION_ENABLED=NO`), and the app asks once on first launch ("Help improve Revvo?"). Nothing is collected until the user taps Allow. The choice is stored in `<documents>/analytics-consent` (wiped on uninstall, so a reinstall asks again) and can be changed in Settings → Privacy & terms → "Share usage analytics". Turning it off calls `setAnalyticsCollectionEnabled(false)` immediately. iOS is built without the advertising-ID pod (`plugins/withFirebaseNoAdId.js`).

## Reports (Firebase console → Analytics)
| Need | Where |
|---|---|
| Most visited screens (views + users) | Reports → Engagement → Pages and screens (card "Views by Page title and screen name"; set the dimension to *Page title and screen class* / screen name) |
| Avg engagement per screen | same report, "Average engagement time" column |
| Feature popularity | Reports → Engagement → Events (event count + users per event) |
| DAU/WAU/MAU, returning users | Reports → Retention (user activity over time, cohorts); Overview shows active users |
| Conversion funnel | **Exploration** → Funnel: `subscription_viewed` → `subscription_purchase_started` → `subscription_purchased` |
| Scan / quiz completion | **Exploration** → Funnel (or Free form): `scan_started`→`scan_completed`, `quiz_started`→`quiz_completed` |

Explorations are in Google Analytics (analytics.google.com → Explore); the rest are standard reports. Standard reports lag 24–48h; use Realtime/DebugView for immediate checks.

## DebugView
- iOS: Xcode scheme → Arguments Passed On Launch → `-FIRAnalyticsDebugEnabled`.
- Android: `adb shell setprop debug.firebase.analytics.app com.suftnet.revvo`.
- Then Firebase console → Analytics → DebugView.
