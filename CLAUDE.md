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
       │    └─ settings.tsx      Appearance, week picker, API key input, Weekly Resource editor, modal launchers
       ├─ (modal)/_layout.tsx  →  presentation: 'modal'
       │    ├─ checkin.tsx        Weekly check-in form (no AI — saves form data, shows "Check-in saved!")
       │    └─ roadmap.tsx        12-week read-only plan
       └─ archive.tsx            Vocabulary archive (pushed from flashcards screen, not a tab)
```

### State: AppContext

All persistent app state lives in `useAppContext()`. The provider calls `initDb()` on mount, then loads settings, badges, and the current week's flashcards into React state. Every write action writes to SQLite first, then updates React state — no optimistic updates.

Key state: `streak`, `xpTotal`, `unlockedBadges`, `settings` (UserSettings), `pendingCheckIn`, `isDbReady`, `currentWeekCards` (FlashcardArchiveEntry[]), `weekCompleteInfo` (`{ completedWeek: number } | null`).

Key actions: `logSession`, `saveFlashcardBatch`, `saveCheckIn`, `patchSettings`, `triggerConfetti`, `refreshStats`, `markCard(id, status)`, `importWeeklyCards(weekNumber, rawCards)`, `dismissWeekComplete`.

`isDbReady` gates all screen renders — show a spinner until `true`.

### Flashcard import and Anki-style study

Cards are imported manually via a JSON paste modal — there is no AI generation of flashcards. The "Import +" button in the flashcard screen opens an `ImportModal` where the user pastes a JSON array. Each item must have `english`, `arabic`, `transliteration`, `situation` string fields. `importWeeklyCards` deletes existing archive cards for the week then inserts the new batch.

The study queue is Anki-style:

- **Again** — re-inserts the card 2 positions ahead in the queue
- **Hard** — moves the card to the end of the queue
- **Good** — marks the card `known` (via `markCard`) and removes it from the queue

Rating buttons appear only after the card is flipped. Flipping is an instant state toggle (no animation). `cards_flipped` (`0|1`) in `UserSettings` persists the orientation preference (0 = English front, 1 = Arabic front); toggled via the ⇄ button in the top bar.

When all cards have been rated Good the session ends and `saveFlashcardBatch` is called (only for the current week, not archive review runs).

### End-of-week logic

On Sunday, `loadState()` calls `getFlashcardReviewForWeek(current_week)`. If a review row exists (i.e. the user completed a session this week) and `current_week < 12`, AppContext increments `current_week`, picks a random known card as the new `phrase_of_day`, saves both to `user_settings`, and sets `weekCompleteInfo`. HomeScreen shows a modal from `weekCompleteInfo`; `dismissWeekComplete` clears it.

### Database: expo-sqlite v13+ async API

`src/lib/db.ts` holds a module-level singleton (`_db`). Tables:

| Table | Purpose |
|---|---|
| `sessions` | Study session log |
| `flashcard_reviews` | Batch summaries (week_number, topic, cards_known, cards_unknown) |
| `badges` | Unlocked badge keys + timestamps |
| `weekly_checkins` | Sunday check-in answers + AI response |
| `user_settings` | Single row (`id=1`) — all app settings including `api_key`, `last_batch_date`, `cards_flipped`, `resource_title`, `resource_subtitle`, `resource_url` |
| `flashcard_archive` | All flashcards from all weeks, permanent vocabulary library |

`flashcard_archive` columns: `id, week_number, topic, arabic_script, transliteration, english_meaning, example_situation, status ('known'|'unknown'), created_at`.

`createTables` also runs `ALTER TABLE` migrations (wrapped in try/catch) for columns added after initial release: `api_key`, `last_batch_date`, `flashcard_reviews.week_number`, `cards_flipped`, `resource_title`, `resource_subtitle`, `resource_url`.

New db functions added: `getFlashcardReviewForWeek(weekNumber)` → `FlashcardReview | null`, `getKnownCardsForWeek(weekNumber)` → `FlashcardArchiveEntry[]`, `deleteArchiveCardsForWeek(weekNumber)` → used by `importWeeklyCards` to replace cards on re-import.

Dates stored as `YYYY-MM-DD` strings; pillars stored as comma-separated strings (e.g. `"flashcards,speaking"`).

### AI integration

`src/lib/api.ts` still exists but AI features are no longer called from the main app flows:

- Flashcard generation is replaced by manual JSON import (see above).
- Check-in no longer calls `generateCheckInResponse` — `saveCheckIn` is called with an empty string for `aiResponse` and the modal shows "Check-in saved!" after submit.
- `phrase_of_day` in `user_settings` is now set by the end-of-week logic (a known card picked at random), not by an API call. HomeScreen reads `settings.phrase_of_day` (JSON string) first, then falls back to a card from `currentWeekCards`.

The API key field in Settings is still present but is only needed if AI features are re-enabled.

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

### HomeScreen quick-launch cards

The bottom of the dashboard has three quick-launch cards that use `Linking.openURL`:

1. **Duolingo** — deep-links to `duolingo://`, falls back to `https://www.duolingo.com`
2. **LingQ** — deep-links to `lingq://`, falls back to `https://www.lingq.com`
3. **Weekly Resource** — opens `settings.resource_url` directly; title and subtitle come from `settings.resource_title` / `settings.resource_subtitle`

The Weekly Resource card is editable from the Settings screen (WEEKLY RESOURCE section with title, subtitle, and URL inputs).

### Image assets

Untracked image files at repo root: `desertbackgroud.png`, `guyoncamelsprite.png`, `arabicappmockupimage.png`. Animation frames in `GUYONCAMELANIMATION/` (camelanimation.png through camelanimation7.png). The desert background and camel sprite are imported and rendered in the HomeScreen hero section. There are no Reanimated animations — the background is a static `Image` and the camel sprite is positioned absolutely.

### XP and badge logic

`src/lib/xp.ts` — pure functions, no side effects. `calculateSessionXp` and `checkBadgeUnlocks` are called inside AppContext actions after DB writes. Badge unlock triggers `triggerConfetti()`. The `conversationalist` badge has no automatic trigger and is not currently wired to any action.

### Notifications

`src/lib/notifications.ts` — local notifications via `expo-notifications`. Identifiers are stable strings (`'daily-reminder'`, `'streak-at-risk'`, `'sunday-checkin'`) so they can be cancelled by ID. `scheduleStreakAtRisk()` fires 20 hours after being called — wiring into `logSession` is not yet implemented.
