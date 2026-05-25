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
npx tsc --noEmit   # Type-check (no known pre-existing errors)
```

There are no tests in this project.

## Architecture

### Render tree

```
AppProvider (src/context/app-context.tsx)
  └─ ThemeProvider + Stack (src/app/_layout.tsx)
       ├─ (tabs)/_layout.tsx  →  AppTabs + BottomNav overlay
       │    ├─ index.tsx         → re-exports HomeScreen (src/components/HomeScreen.tsx)
       │    ├─ flashcards.tsx    Anki-style flashcard study engine
       │    ├─ log.tsx           Activity log + line chart
       │    ├─ resources.tsx     Filterable resource list
       │    └─ settings.tsx      Appearance, 52-week picker, API key, Weekly Resource editor
       ├─ (modal)/_layout.tsx  →  presentation: 'modal'
       │    ├─ checkin.tsx        Weekly check-in form
       │    └─ roadmap.tsx        Read-only 12-week plan
       └─ archive.tsx            Vocabulary archive — By Week / By Month tabs (pushed, not a tab)
```

### State: AppContext

All persistent app state lives in `useAppContext()`. The provider calls `initDb()` on mount, then loads settings, badges, and the current week's flashcards into React state. Every write action writes to SQLite first, then updates React state — no optimistic updates.

Key state:
- `streak`, `xpTotal`, `unlockedBadges`, `settings` (UserSettings)
- `pendingCheckIn`, `isDbReady`
- `currentWeekCards` (FlashcardArchiveEntry[]) — cards for the current program week
- `weekActivityDates` (string[]) — distinct `YYYY-MM-DD` dates that had logged activity for the current program week; used to render the 7-dot streak tracker on HomeScreen
- `weekCompleteInfo` (`{ completedWeek: number } | null`)

Key actions: `logSession`, `saveFlashcardBatch`, `saveCheckIn`, `patchSettings`, `triggerConfetti`, `refreshStats`, `markCard(id, status)`, `importWeeklyCards(weekNumber, rawCards)`, `dismissWeekComplete`, `clearWeekCards(weekNumber)`.

`isDbReady` gates all screen renders — show a spinner until `true`.

**`patchSettings` is reactive for `current_week`:** When `patchSettings({ current_week: n })` is called, it immediately re-fetches `getArchiveCardsForWeek(n)` and `getActivityLogByWeek(n)`, updating both `currentWeekCards` and `weekActivityDates`. Changing weeks in Settings is instant.

**Streak reset on load:** `loadState()` checks `last_session_date`. If it is more than 1 day ago, `streak_count` is reset to 0 in DB and state before rendering. The streak only stays alive if a session was logged today or yesterday.

### Flashcard import and Anki-style study

Cards are imported manually via a JSON paste modal — no AI generation. The "Import +" button opens an `ImportModal` where the user pastes a JSON array. Each item must have `english`, `arabic`, `transliteration`, `situation` string fields. `importWeeklyCards` deletes existing archive cards for the week then inserts the new batch.

The study queue is Anki-style:

- **Again** — re-inserts the card 2 positions ahead in the queue; marks card `again` in DB
- **Hard** — moves the card to the end of the queue; marks card `hard` in DB
- **Good** — marks the card `known` (via `markCard`) and removes it from the queue

The card has a fixed height (`screenHeight * 0.46` via `useWindowDimensions`). The front face shows a **Show Answer** button; rating buttons (Again / Hard / Good) only appear after the card is flipped. All touch targets use `TouchableOpacity`. Flipping toggles a local `flipped` state with no animation.

`cards_flipped` (`0|1`) in `UserSettings` persists orientation (0 = English front, 1 = Arabic front); toggled via the ⇄ button in the top bar.

**Queue reset guard:** A `loadedCardIdsRef` ref stores the sorted card IDs of the currently loaded set. The `useEffect` watching `currentWeekCards` only resets the queue when the card ID set changes (import or clear) — not on `markCard` status-only updates, which would otherwise interrupt an active session.

**Shuffle:** `restart()` (Review Again button) and the `reviewWeek` archive load both apply a Fisher-Yates shuffle before setting the queue. Initial load of current-week cards is in import order.

When all cards are rated Good, the session ends and `saveFlashcardBatch` is called (only for current-week sessions, not archive review runs).

### End-of-week logic

On Sunday, `loadState()` calls `getFlashcardReviewForWeek(current_week)`. If a review row exists and `current_week < 12`, AppContext increments `current_week`, picks a random known card as the new `phrase_of_day`, saves both to `user_settings`, and sets `weekCompleteInfo`. HomeScreen shows a modal from `weekCompleteInfo`; `dismissWeekComplete` clears it. The Settings picker allows manual selection up to week 52.

### Database: expo-sqlite v13+ async API

`src/lib/db.ts` holds a module-level singleton (`_db`). Tables:

| Table | Purpose |
|---|---|
| `sessions` | Study session log |
| `flashcard_reviews` | Batch summaries (week_number, topic, cards_known, cards_unknown) |
| `badges` | Unlocked badge keys + timestamps |
| `weekly_checkins` | Sunday check-in answers |
| `user_settings` | Single row (`id=1`) — all app settings |
| `flashcard_archive` | All flashcards from all weeks, permanent vocabulary library |
| `activity_log` | Per-activity log entries (activity_type, minutes, week_number, date) |
| `weekly_summary` | Auto-calculated weekly totals (created on week-advance) |

`flashcard_archive` columns: `id, week_number, topic, arabic_script, transliteration, english_meaning, example_situation, status ('known'|'unknown'|'again'|'hard'), created_at`.

`user_settings` columns include: `api_key`, `last_batch_date`, `cards_flipped`, `resource_title`, `resource_subtitle`, `resource_url`, `phrase_of_day`, `phrase_of_day_date`.

`createTables` runs `ALTER TABLE` migrations (wrapped in try/catch) for columns added after initial release.

Key db functions:
- `getArchiveMonths()` — `GROUP BY strftime('%Y-%m', created_at)` → `{ month, count }[]`
- `getArchiveCardsByMonth(month)` — all cards where `strftime('%Y-%m', created_at) = month`
- `getActivityLogByWeek(weekNumber)` — used to derive `weekActivityDates` in AppContext
- `getFlashcardReviewForWeek(weekNumber)`, `getKnownCardsForWeek(weekNumber)`, `deleteArchiveCardsForWeek(weekNumber)`

Dates stored as `YYYY-MM-DD` strings. Pillars stored as comma-separated strings.

### Activity log and Log screen

`logSession` in AppContext calls `insertActivityLog` when `activityType` is provided, then refreshes `weekActivityDates` from the DB. The web stub for `activity_log` uses an in-memory array (not a no-op) so the chart updates during browser preview.

The Log screen (`src/app/(tabs)/log.tsx`) has:
- Single-select activity type pills (Flashcards / Structured Study / Speaking Practice / Listening / Tutor Session)
- Time-range selector (1W / 1M / 3M / 6M / 1Y)
- Pure-View line chart (no SVG library) — line segments computed via midpoint + rotation transform
- Session history list below the chart

### Archive screen

`src/app/archive.tsx` has two tabs toggled at the top:

- **By Week** — grid of weeks 1 to `Math.max(current_week, highestWeekWithCards)`; weeks with imported cards are highlighted (olive). Selecting a week loads and shows its cards inline with status dots, delete buttons, and a "Review Again" link to `/flashcards?reviewWeek=N`.
- **By Month** — accordion list of calendar months that have cards (from `getArchiveMonths()`); tap to expand via `getArchiveCardsByMonth(month)`.

The archive screen remounts on each push so `loadData()` always reflects current DB state.

### AI integration

`src/lib/api.ts` exists but is not called from any main app flow. The API key field in Settings is present for future use only.

### Navigation: custom BottomNav

The native tab bar is hidden. Navigation is handled by `src/components/bottom-nav.tsx`, a floating pill overlay rendered in `(tabs)/_layout.tsx`. `BottomNav` uses `useSegments()` to determine the active tab and `router.push()` to navigate.

`AppTabs` (native) uses `expo-router`'s `Tabs` with `tabBarStyle: { display: 'none' }`. `AppTabs` (web) uses `expo-router/ui`'s `Tabs` with a hidden `TabList`.

### Styling system

**Two coexisting style patterns:**

**New pattern** (HomeScreen, Log, Resources, Settings, Flashcards, Archive): each file defines a local `const C = { ... }` or `const COLORS = { ... }` palette using the sand/dark aesthetic (`'#CBB77C'` sand, `'#15150F'` dark bg, `'rgba(14,15,15,0.78)'` blackGlass, `'#F7C653'` gold, `'#9BC76D'` olive). No `useTheme()`.

**Old pattern** (ThemedView, ThemedText, ui components): `StyleSheet.create` with tokens from `src/constants/theme.ts` — `Colors.light/dark`, `Spacing` (half=2, one=4, two=8, three=16, four=24, five=32, six=64).

Dark mode is stored in `user_settings.dark_mode` (`'light'|'dark'|'system'`). Written via `patchSettings` but does not yet feed into `useTheme()`.

### Platform-specific files

`.web.tsx` / `.web.ts` suffix files override native counterparts on web:
- `src/lib/db.web.ts` — SQLite no-ops plus full in-memory implementations for `flashcard_archive` (all CRUD) and `activity_log` (insert + range queries). Data resets on page refresh — expected behaviour.
- `src/components/app-tabs.web.tsx` — uses `expo-router/ui` Tabs
- `src/components/animated-icon.web.tsx` — CSS-based animation
- `src/hooks/use-color-scheme.web.ts` — hydration-safe SSR version

### HomeScreen layout

Scroll order (top → bottom):

1. **Phrase of the Day card** — full-width cream card; parses `settings.phrase_of_day` (JSON `PhraseOfDay`), falls back to a card from `currentWeekCards`. Replaces the old header.
2. **Hero** — 400px full-bleed desert image (`marginHorizontal: -16`) with camel sprite and `LinearGradient` overlays (top 100px, bottom 140px) fading to sand `#CBB77C`. No content overlays — purely visual.
3. **Quick-launch row** — Duolingo / LingQ / Weekly Resource as three `progressCardBase` dark-glass cards in a row; same gap/margin as the cards below. Weekly Resource title/subtitle/URL are editable in Settings.
4. **Progress row** — Study Streak card (with 7-dot Mon–Sun tracker) + Week N Cards card (Again/Hard/Good counts from `currentWeekCards`).
5. **Weekly Check-In button**

**7-dot streak tracker:** `streakDots` is a `boolean[7]` (Mon–Sun of the current calendar week) derived from `weekActivityDates` in AppContext. A dot is gold if that date appears in `weekActivityDates` for the current program week. Changing the program week in Settings reloads `weekActivityDates`, so dots reset for the new week.

### Image assets

Untracked files at repo root: `desertbackgroud.png`, `guyoncamelsprite.png`, `arabicappmockupimage.png`. Animation frames in `GUYONCAMELANIMATION/`. No Reanimated — the hero is a static `Image` with an absolutely positioned camel sprite.

### XP and badge logic

`src/lib/xp.ts` — pure functions. `calculateSessionXp` and `checkBadgeUnlocks` called inside AppContext after DB writes. Badge unlock triggers `triggerConfetti()`. The `conversationalist` badge is defined but not wired to any automatic trigger.

### Notifications

`src/lib/notifications.ts` — local notifications via `expo-notifications`. Stable identifier strings (`'daily-reminder'`, `'streak-at-risk'`, `'sunday-checkin'`) allow cancellation by ID. `scheduleStreakAtRisk()` is defined but not yet wired into `logSession`.
