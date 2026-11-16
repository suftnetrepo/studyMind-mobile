# Revvo — App Store submission audit and checklist

Audited 2026-11-14 on `main` (857199b) plus the changes on `chore/app-store-prep`.
Bundle ID `com.suftnet.revvo` · Team `ZQADUF26X5` · Version 1.0.4 · Build 1 · iOS 15.1+ · Xcode 26.4.

The app is a **student-only** study companion (sign in or register as a student; lecturers use the web app).

## 1. Verdict

Technically ready to archive. Four things need a decision or action from you before pressing "Submit for Review":

| # | Item | Why it matters | Action |
|---|---|---|---|
| 1 | **No in-app consent before sending study content to OpenAI** | App Review guideline 5.1.2(i) (Nov 2025): you must disclose where personal data goes to third-party AI and get explicit permission first. The privacy policy discloses it; the app does not ask. | Add a one-time "Revvo uses OpenAI to answer…" consent screen before first AI use (can reuse the analytics-consent pattern). **Highest rejection risk.** |
| 2 | **Privacy policy is out of date** | It still describes RevenueCat and in-app purchases. Both were removed. Reviewers compare the policy with the app. | Edit the policy page (`suftnetrepo.github.io/revvo-ios`) to remove the "Purchase information / RevenueCat" section. |
| 3 | **iPad** | `supportsTablet: true`, so App Store Connect requires iPad screenshots and the iPad layout must look right. The app is portrait phone UI. | Either test on an iPad simulator and take iPad screenshots, or set `supportsTablet: false` for 1.0 (simplest). |
| 4 | **Reviewer demo account** | Apple must be able to sign in. | Create a student account with a module, documents and some AI history; put its login in App Store Connect → App Review Information (never in the repo). |

Done on this branch: AI consent screen (#1), build number 2 (iPad stays enabled: this is an update to a live app, so keep iPad support). Still yours: #2 and #4.

Also confirm: if 1.0.4 build 1 was already uploaded to TestFlight, the next upload needs **build 2** (build numbers must be unique per version).

## 2. Audit results

| Area | Status | Notes |
|---|---|---|
| Bundle ID, team, version, build | OK | `com.suftnet.revvo`, 1.0.4 (1). Firebase plist bundle ID matches. |
| Encryption export compliance | OK | `ITSAppUsesNonExemptEncryption = false` (standard HTTPS only). |
| App icon | OK | 1024×1024, no alpha channel. |
| Permission strings | OK | Camera, microphone, photo library all have clear, purpose-specific text. No location, contacts, tracking, or Face ID prompts. |
| Privacy manifest (`PrivacyInfo.xcprivacy`) | OK | Required-reason APIs declared, `NSPrivacyTracking = false`. Collected-data array is empty; the App Store Connect labels (section 5) still must be filled in. |
| App Tracking Transparency | N/A | No tracking; Firebase ad ID disabled (`withFirebaseNoAdId`). Do not add an ATT prompt. |
| Sign in with Apple | N/A | Email and password only. No third-party social login. |
| Account deletion | OK | Settings → Delete account (calls `DELETE` on the account and clears local data). Required for apps with account creation. |
| In-app purchases / external payment links | OK | RevenueCat and all upgrade UI were removed; no Stripe or checkout links anywhere in the app. Guideline 3.1.1 is not triggered. |
| Policy, terms, support URLs | OK | All three GitHub Pages URLs return 200. Support email is set. |
| Analytics consent | OK | Opt-in dialog on first launch; analytics off until "Allow"; changeable in Settings. |
| Crash reporting | Note | Sentry is on; declare "Crash data" and "User ID" in the privacy labels (see section 5). |
| Push notifications | N/A | No `aps-environment` entitlement, no push. |
| Background modes | OK | None declared. (The Firebase log warnings about `fetch` / `remote-notification` are harmless.) |
| Demo credentials in the UI | OK | Shown only when `__DEV__`; not in release builds. |
| Version shown in Settings | **Fixed** | Settings showed "v1.0.1" (hard-coded). It now reads the version from `app.json`. |
| Secrets in git | OK | Keystore, `credentials/`, Firebase files, `.env`, `ios/`, `android/` are all gitignored; none tracked. |
| Xcode / SDK | OK | Built with Xcode 26.4 (meets the current App Store SDK requirement). |
| Maths rendering needs internet | Note | KaTeX loads from a CDN and falls back to plain text offline. Fine for review; bundle KaTeX later if you want offline maths. |
| `expo-av` deprecation | Note | Warned as removed in Expo SDK 54. Not a store issue today. |
| iOS screenshots | **Missing** | `store-assets/` only has Android assets (1080×2400). |
| AI content safety (guideline 1.2 / 4.x) | Note | AI chat with open prompts: be ready to explain moderation (provider-side filtering) in review notes; consider a visible "Report a problem" path (Help & Support email exists). |

## 3. App Store Connect — metadata draft

- **Name:** Revvo — AI Study Companion (30 chars max; "Revvo" alone if taken)
- **Subtitle:** Study smarter with your courses (30 max)
- **Category:** Primary Education; secondary Productivity
- **Promotional text:** Ask questions about your course notes, turn them into quizzes and flashcards, and get clear summaries — all in one place.
- **Description:**
  Revvo is your AI study companion for the courses you're taking.
  • Join your lecturer's module with an enrolment code, or create your own.
  • Ask the AI Tutor questions and get answers grounded in your course materials, with sources.
  • Generate quizzes, flashcards and summaries from your notes and documents.
  • Scan pages with your camera, or upload PDFs and text.
  • Maths and science notation is shown properly typeset.
  • Your progress, streaks and notes stay with you across devices.
- **Keywords (100 chars max):** study,quiz,flashcards,AI tutor,notes,exam,revision,university,summary,homework
- **Support URL:** https://suftnetrepo.github.io/revvo-ios/support.html
- **Privacy Policy URL:** https://suftnetrepo.github.io/revvo-ios/
- **Marketing URL (optional):** leave blank
- **Copyright:** © 2026 Suftnet Ltd (use the legal entity name on your developer account)
- **What's New (1.0.4):** Student-only experience, clearer ways to join or create a module, and properly typeset maths in answers.

## 4. Age rating questionnaire (suggested answers)

- Unrestricted web access: **No**
- User-generated content / chat with other users: **No** (AI chat is private, not user-to-user)
- AI-generated content: answer per the current questionnaire (the app generates text answers)
- Violence, sexual content, profanity, gambling, horror, drugs: **None**
- Medical/wellness: **None**
- Expected rating: **4+** (Apple may raise it for AI-generated text; 12+ is the realistic worst case)

## 5. App Privacy ("nutrition label") — what to declare

Data **linked to the user**, **not used for tracking**:

| Data type | Why it's collected | Notes |
|---|---|---|
| Contact info → Email address, Name | Account creation, sign-in | |
| User content → Other user content (documents, scans, chats, notes) | App functionality (AI answers, quizzes, flashcards) | Processed by OpenAI via the Revvo backend. |
| User content → Audio data | App functionality (voice input) | Sent to OpenAI for transcription; not retained. |
| Identifiers → User ID | App functionality, diagnostics | Sentry user id. |
| Usage data → Product interaction | Analytics | **Only if the user taps Allow.** Declare as collected (optional). |
| Diagnostics → Crash data, Performance data | App functionality | Sentry. |

Tracking: **No.** Third-party SDKs to mention if asked: Firebase Analytics (consented), Sentry, OpenAI (via backend).

## 6. App Review Information (paste into App Store Connect)

- **Sign-in required:** Yes
- **Demo account:** `<student email>` / `<password>` — *fill in privately; do not commit.*
- **Notes:**
  Revvo is a student-only study companion. Sign in with the demo student account above. The Home tab shows a module ("Year 5 Mathematics" etc.); open a module and use Tutor, Quiz, Cards and Summary to try the AI features (these call our backend and need an internet connection). To join a course, Modules tab → + → "Join a course with a code". Account deletion: Settings → Delete account. There are no in-app purchases and no external payment links. AI answers are generated by OpenAI through our server; the privacy policy describes this.

## 7. Screenshots

Required (App Store Connect auto-scales smaller sizes):
- **iPhone 6.9"** — 1320×2868 (or 1290×2796). 3–10 shots.
- **iPad 13"** — 2064×2752, **only if `supportsTablet` stays true**.

Suggested order: Home (streak and modules) → AI Tutor answer with sources → Quiz → Flashcards → Summary → Typeset maths answer → Join a course. Capture from the iPhone 17 Pro simulator (already set up) with a clean demo account; hide the dev "Open debugger" toast (Release build has none).

## 8. Build and upload

No `eas.json` in the repo, so use Xcode:

1. Bump the build number (app.json → `ios.buildNumber`, e.g. `"2"`), then `npx expo prebuild --platform ios` if native config changed.
2. `cd ios && pod install`
3. Open `ios/Revvo.xcworkspace` → scheme **Revvo** → destination **Any iOS Device (arm64)** → Product → Archive.
4. Organizer → Distribute App → **App Store Connect** → Upload.
5. In App Store Connect, wait for processing, attach the build to version 1.0.4, add the metadata above, answer the export-compliance prompt (already declared exempt), then **Submit for Review**.

To avoid uploading Sentry source maps from a local machine unintentionally, set `SENTRY_AUTH_TOKEN` only when you want them uploaded (otherwise set `SENTRY_DISABLE_AUTO_UPLOAD=true`).

## 9. Final test pass on a real device (Release build)

- [ ] Fresh install: analytics consent appears once; onboarding; sign in; relaunch stays signed in
- [ ] Register a new student account; sign in with a non-student account → "Students only"
- [ ] Join a course by code; create a personal module (keyboard never hides the button)
- [ ] Tutor, Quiz, Flashcards, Summary all produce results; maths is typeset
- [ ] Camera scan, photo upload, voice input (permission prompts show the right text)
- [ ] Settings → Delete account works; Privacy & terms / Help links open
- [ ] Airplane mode: friendly errors, maths falls back to text, no crash
- [ ] Dark mode and large text look right
