# Palestinian Arabic Hub 🌿

A personal Palestinian Arabic language-learning accountability app built with Expo and React Native. The core loop: open → study AI-generated flashcards → check off practice pillars → log session → earn XP.

## Features

- **Weekly AI flashcards** — 10 Palestinian/Levantine Arabic phrases generated each week via Claude, organised by topic (greetings, food, family, etc.). Cards flip from English/example → Arabic script + transliteration.
- **Vocabulary Archive** — every completed week is saved permanently so you can browse and re-study past batches.
- **Four pillars** — Flashcards, Structured Study, Speaking, Listening. Check off what you did today and log the session.
- **Streak & XP** — daily streak tracking with a 7-day multiplier; badges unlock at milestones.
- **Phrase of the Day** — a fresh Palestinian Arabic phrase each morning, cached so it only calls the API once per day.
- **Weekly check-in** — Sunday prompt with six reflection questions; AI coach responds with personalised feedback.
- **12-week roadmap** — read-only study plan accessible from Settings.
- **Dark mode** — system/light/dark toggle in Settings.

## Tech stack

- **Expo SDK 56** / React Native 0.85.3 / React 19
- **Expo Router v56** — file-based routing, typed routes
- **expo-sqlite v13+** — local persistent storage (WAL mode)
- **@anthropic-ai/sdk** — Claude `claude-sonnet-4-6` for flashcard generation, phrase of the day, and check-in coaching
- **react-native-reanimated v4** — flip card animation
- TypeScript strict mode, React Compiler enabled

## Getting started

```bash
npm install
npm run web        # Browser preview (SQLite stubbed, no AI calls)
npm run android    # Android emulator
npm run ios        # iOS simulator
```

> **npm** on Windows may not be in PATH: use `C:\Program Files\nodejs\npm.cmd` or add it manually.

### API key

The app requires an Anthropic API key for all AI features. Go to **Settings → ANTHROPIC API KEY**, paste your key (starts with `sk-ant-`), and tap away to save. The key is stored locally in SQLite and never leaves the device.

Get a key at [console.anthropic.com](https://console.anthropic.com).

## Project structure

```
src/
  app/
    (tabs)/         Main tab screens (Dashboard, Flashcards, Log, Resources, Settings)
    (modal)/        Modal screens (Weekly check-in, Roadmap)
    archive.tsx     Vocabulary archive (past flashcard weeks)
  components/       Shared UI components
  context/          AppContext — single source of truth for all app state
  lib/
    api.ts          Anthropic API calls
    db.ts           SQLite schema + all DB functions
    xp.ts           XP calculation and badge logic
  constants/        Theme tokens (colors, spacing)
  data/             Static data (flashcard topics, resources, roadmap)
```

## Build & deploy

This project is linked to EAS (project ID `dfcec244-00fa-46a6-a629-7e7eb54eecd3`).

```bash
eas build --platform android --profile preview   # APK for testing
eas build --platform android --profile production
eas build --platform ios --profile production
```
