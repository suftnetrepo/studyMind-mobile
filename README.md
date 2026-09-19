# StudyMind AI — React Native App

Mobile frontend for the StudyMind AI platform.
Built with Expo Router, Fluent Styles, Plus Jakarta Sans, and Zustand.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 53 + Expo Router 5 |
| UI Library | fluent-styles ^1.62.14 |
| Typography | Plus Jakarta Sans (400/500/600/700/800) |
| State | Zustand 5 |
| Navigation | Expo Router (file-based) |
| Language | TypeScript |

---

## Prerequisites

- Node 18+
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode 15+ or Expo Go app
- Android: Android Studio or Expo Go app

---

## Setup

```bash
# 1. Install dependencies
yarn install
# or
npm install

# 2. Configure API URL
# Edit src/services/api.ts line 6:
export const API_BASE = 'http://localhost:8000'  # or your server IP

# 3. Start the dev server
npx expo start

# 4. Run on iOS simulator
npx expo run:ios

# 5. Run on Android emulator
npx expo run:android

# 6. Run on physical device
# Install Expo Go → scan QR code from `expo start`
```

---

## Project structure

```
app/
├── _layout.tsx          Root layout — fonts, auth guard, portal provider
├── auth/
│   └── login.tsx        Login + register with role picker
├── (tabs)/
│   ├── _layout.tsx      Bottom tab navigator (Home, Modules, Activity, Profile)
│   └── index.tsx        Home dashboard — study streak, modules, AI tools
├── module/
│   └── [id].tsx         Module detail — overview, documents, chat history
├── chat/
│   └── index.tsx        AI Tutor chat — scoped Q&A with citations
├── quiz/
│   └── index.tsx        Quiz generator — setup, take, results with explanations
├── flashcards/
│   └── index.tsx        Flashcard generator — flip cards, mark mastered
└── summary/
    └── index.tsx        AI Summary — structured module/week/doc summaries

src/
├── constants/
│   ├── themes.ts        Light + dark colour palettes
│   ├── useColors.ts     useColors() hook
│   └── index.ts        All helpers — getFieldColors, getModuleColors, TOOLS
├── components/
│   ├── Text.tsx         Styled text with Plus Jakarta Sans variants
│   ├── ScreenHeader.tsx Compact + large header patterns
│   ├── EmptyState.tsx   Empty state card with optional CTA
│   └── ScopePill.tsx    SRCH-05 scope indicator chip
├── stores/
│   └── index.ts        Zustand — auth, theme, active module
└── services/
    └── api.ts          All HTTP calls to StudyMind FastAPI backend
```

---

## Connecting to the backend

### Local simulator (iOS)
```
API_BASE = 'http://localhost:8000'
```

### Physical device on same WiFi
```
API_BASE = 'http://192.168.x.x:8000'
```
Find your Mac IP: `ifconfig | grep "inet " | grep -v 127`

### Production
```
API_BASE = 'https://your-deployed-api.com'
```

---

## Demo credentials

After running `python scripts/seed_demo.py` on the backend:

| Role | Email | Password |
|------|-------|----------|
| Lecturer | lecturer@demo.ac.uk | Lecturer1234 |
| Student | student@demo.ac.uk | Student1234 |
| Self-learner | learner@example.com | Learner1234 |

---

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | /auth/login | Role picker, email/password, demo hint |
| Home | /(tabs) | Study streak, AI tools, enrolled modules |
| Module detail | /module/[id] | Overview, documents, chat history tabs |
| AI Tutor chat | /chat | Scoped Q&A with citations and scope picker |
| Quiz | /quiz | Generate → take → results with explanations |
| Flashcards | /flashcards | Generate → flip → mark mastered/learning |
| Summary | /summary | Generate structured module/week/doc summary |
# studyMind-mobile
