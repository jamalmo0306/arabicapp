# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

**npm is at `C:\Program Files\nodejs\npm.cmd`** — not in PATH by default. In Bash: `export PATH="/c/Program Files/nodejs:$PATH"`. In PowerShell: use the full path `& "C:\Program Files\nodejs\npm.cmd" <args>`.

```bash
npm start          # Expo dev server
npm run android    # Open on Android emulator
npm run ios        # Open on iOS simulator
npm run web        # Open in browser (uses db.web.ts stubs — SQLite is no-op)
npm run lint       # Run expo lint
npx tsc --noEmit   # Type-check (2 pre-existing CSS module errors are benign)
```

There are no tests in this project.

## Architecture

### Render tree

```
AppProvider (src/context/app-context.tsx)
  └─ ThemeProvider + Stack (src/app/_layout.tsx)
       ├─ (tabs)/_layout.tsx  →  AppTabs + BottomNav overlay
       │    ├─ index.tsx         → re-exports HomeScreen (src/components/HomeScreen.tsx)
       │    ├─ flashcards.tsx    Weekly flashcard engine (English-front / Arabic-back)
       │    ├─ log.tsx           Session log + bar chart
       │    ├─ resources.tsx     Filterable resource list
       │    └─ settings.tsx      Appearance, week picker, API key input, modal launchers
       ├─ (modal)/_layout.tsx  →  presentation: 'modal'
       │    ├─ checkin.tsx        Weekly check-in form + AI coach
       │    └─ roadmap.tsx        12-week read-only plan
       └─ archive.tsx            Vocabulary archive (pushed from flashcards screen, not a tab)
```

### State: AppContext

All persistent app state lives in `useAppContext()`. The provider calls `initDb()` on mount, then loads settings, badges, and the current week's flashcards into React state. Every write action writes to SQLite first, then updates React state — no optimistic updates.

Key state: `streak`, `xpTotal`, `unlockedBadges`, `settings` (UserSettings), `pendingCheckIn`, `isDbReady`, `newBatchReady`, `currentWeekCards` (FlashcardArchiveEntry[]), `generatingBatch`.

Key actions: `logSession`, `saveFlashcardBatch`, `saveCheckIn`, `patchSettings`, `triggerConfetti`, `refreshStats`, `markCard(id, status)`, `dismissNewBatch`, `triggerWeeklyGeneration`.

`isDbReady` gates all screen renders — show a spinner until `true`.

### Weekly flashcard generation

On `loadState()`, AppContext checks whether `flashcard_archive` has rows for the current `settings.current_week`. If not, and if `settings.api_key` is set, it calls `generateBatch()` in the background. The topic is determined by week number:

- Weeks 1–10: fixed rotation from `FLASHCARD_TOPICS` (index = `(weekNumber - 1) % 10`)
- Weeks 11–12: the topic with the most `status = 'unknown'` cards in the archive (`getMostUnknownTopic()`)

When `patchSettings({ api_key })` is called with a non-empty key and no cards exist yet, generation is also triggered immediately. The `newBatchReady` flag is set to `true` after a successful generate so the dashboard can show a banner.

### Database: expo-sqlite v13+ async API

`src/lib/db.ts` holds a module-level singleton (`_db`). Tables:

| Table | Purpose |
|---|---|
| `sessions` | Study session log |
| `flashcard_reviews` | Batch summaries (week_number, topic, cards_known, cards_unknown) |
| `badges` | Unlocked badge keys + timestamps |
| `weekly_checkins` | Sunday check-in answers + AI response |
| `user_settings` | Single row (`id=1`) — all app settings including `api_key`, `last_batch_date` |
| `flashcard_archive` | All flashcards from all weeks, permanent vocabulary library |

`flashcard_archive` columns: `id, week_number, topic, arabic_script, transliteration, english_meaning, example_situation, status ('known'|'unknown'), created_at`.

`createTables` also runs `ALTER TABLE` migrations (wrapped in try/catch) for columns added after initial release: `api_key`, `last_batch_date`, `flashcard_reviews.week_number`.

Dates stored as `YYYY-MM-DD` strings; pillars stored as comma-separated strings (e.g. `"flashcards,speaking"`).

### AI integration

`src/lib/api.ts` — non-streaming `messages.create` to `claude-sonnet-4-6`. **API key is stored at runtime in `user_settings.api_key`** (entered via the Settings screen) — not in `.env`. Each exported function takes `apiKey: string` as a parameter; a new Anthropic client is created per call.

Functions: `generateFlashcards(topic, apiKey)` → `FlashCard[]`, `generatePhraseOfDay(apiKey)` → `PhraseOfDay`, `generateCheckInResponse(answers, apiKey)` → string. Each retries up to 3 times and strips markdown fences before `JSON.parse`.

Phrase of the day is cached in `user_settings.phrase_of_day` + `phrase_of_day_date` (only one API call per calendar day).

### Navigation: custom BottomNav

The native tab bar is hidden. Navigation is handled by `src/components/bottom-nav.tsx`, a floating pill overlay rendered in `(tabs)/_layout.tsx` on top of `AppTabs`. `BottomNav` uses `useSegments()` to determine the active tab and `router.push()` to navigate.

`AppTabs` (native) uses `expo-router`'s `Tabs` with `tabBarStyle: { display: 'none' }`. `AppTabs` (web) uses `expo-router/ui`'s `Tabs` with a hidden `TabList` — both exist only to register routes.

### Styling system

**Two coexisting style patterns** — new screens use inline color constants; older components use the theme system:

**New pattern** (HomeScreen, Log, Resources, Settings): each file defines a local `const C = { ... }` palette using the sand/dark aesthetic (`scrollBg: '#CBB77C'`, `bg: '#15150F'`, `blackGlass: 'rgba(14,15,15,0.88)'`, `gold: '#F7C653'`, `olive: '#9BC76D'`). No `useTheme()`.

**Old pattern** (ThemedView, ThemedText, ui components): `StyleSheet.create` with tokens from `src/constants/theme.ts`:
- `Colors.light` / `Colors.dark` — `primary` (olive `#4A5E3A`), `accent` (gold `#C9952A`), `surface`, `cream`, `onPrimary`, `divider`
- `useTheme()` → returns active palette; `Spacing` — `half(2) one(4) two(8) three(16) four(24) five(32) six(64)`

Dark mode is stored in `user_settings.dark_mode` (`'light'|'dark'|'system'`). The override is written via `patchSettings` but does not yet feed back into `useTheme()`.

### Platform-specific files

`.web.tsx` / `.web.ts` suffix files override their native counterparts on web (Expo's automatic platform resolution):
- `src/lib/db.web.ts` — complete no-op stub; all reads return empty/defaults so web renders without SQLite
- `src/components/app-tabs.web.tsx` — uses `expo-router/ui` Tabs with hidden TabList (navigation via BottomNav)
- `src/components/animated-icon.web.tsx` — CSS-based animation
- `src/hooks/use-color-scheme.web.ts` — hydration-safe SSR version

### Image assets

Untracked image files at repo root: `desertbackgroud.png`, `guyoncamelsprite.png`, `arabicappmockupimage.png`. Animation frames in `GUYONCAMELANIMATION/` (camelanimation.png through camelanimation7.png). These are not yet imported anywhere — placeholder for a future hero/animation feature. The hero section in `HomeScreen.tsx` has a `TODO` comment showing exactly where to wire in an `ImageBackground`.

### XP and badge logic

`src/lib/xp.ts` — pure functions, no side effects. `calculateSessionXp` and `checkBadgeUnlocks` are called inside AppContext actions after DB writes. Badge unlock triggers `triggerConfetti()`. The `conversationalist` badge has no automatic trigger and is not currently wired to any action.

### Notifications

`src/lib/notifications.ts` — local notifications via `expo-notifications`. Identifiers are stable strings (`'daily-reminder'`, `'streak-at-risk'`, `'sunday-checkin'`) so they can be cancelled by ID. `scheduleStreakAtRisk()` fires 20 hours after being called — wiring into `logSession` is not yet implemented.
