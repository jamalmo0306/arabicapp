// Web stub — expo-sqlite's WASM build is not bundled in this setup.
// Sessions, badges, checkins, and weekly summaries are no-ops.
// flashcard_archive and activity_log use in-memory arrays so the app
// is fully functional within a browser session (resets on page refresh).

import type {
  ActivityLog,
  Badge,
  BadgeKey,
  FlashCard,
  FlashcardArchiveEntry,
  FlashcardReview,
  Session,
  Song,
  UserSettings,
  WeeklyCheckIn,
  WeeklySummary,
} from '@/context/types';

const DEFAULT_SETTINGS: UserSettings = {
  notification_time: '20:00',
  current_week: 1,
  dark_mode: 'system',
  xp_total: 0,
  streak_count: 0,
  last_session_date: null,
  last_batch_date: null,
  phrase_of_day: null,
  phrase_of_day_date: null,
  favorite_resource_ids: '',
  api_key: '',
  cards_flipped: 0 as 0 | 1,
  resource_title: 'This Week',
  resource_subtitle: 'Learn Arabic with Maha',
  resource_url: 'https://www.youtube.com/@LearnArabicwithMaha',
};

export async function initDb(): Promise<void> {}
export async function getDb(): Promise<never> { throw new Error('SQLite not available on web'); }

export async function insertSession(_: Omit<Session, 'id'>): Promise<number> { return 0; }
export async function getSessionsForWeek(_: string): Promise<Session[]> { return []; }
export async function getRecentSessions(_?: number): Promise<Session[]> { return []; }
export async function getTotalMinutes(): Promise<number> { return 0; }
export async function getTotalFlashcardBatches(): Promise<number> { return 0; }
export async function getTutorSessionCount(): Promise<number> { return 0; }

export async function insertFlashcardReview(_: Omit<FlashcardReview, 'id'>): Promise<void> {}

export async function insertBadge(_: BadgeKey): Promise<void> {}
export async function getAllBadges(): Promise<Badge[]> { return []; }

export async function insertCheckIn(_: Omit<WeeklyCheckIn, 'id'>): Promise<void> {}
export async function getCheckInForWeek(_: string): Promise<WeeklyCheckIn | null> { return null; }

export async function getSettings(): Promise<UserSettings> { return { ...DEFAULT_SETTINGS }; }
export async function updateSettings(_: Partial<UserSettings>): Promise<void> {}

// ── In-memory flashcard archive ───────────────────────────────────────────────

let _archiveCards: FlashcardArchiveEntry[] = [];
let _nextArchiveId = 1;

export async function insertArchiveCards(weekNumber: number, topic: string, cards: FlashCard[]): Promise<void> {
  const now = new Date().toISOString();
  for (const c of cards) {
    _archiveCards.push({
      id: _nextArchiveId++,
      week_number: weekNumber,
      topic,
      arabic_script: c.arabic_script,
      transliteration: c.transliteration,
      english_meaning: c.english_meaning,
      example_situation: c.example_situation,
      status: 'unknown',
      created_at: now,
    });
  }
}

export async function getArchiveCardsForWeek(weekNumber: number): Promise<FlashcardArchiveEntry[]> {
  return _archiveCards.filter(c => c.week_number === weekNumber).sort((a, b) => a.id - b.id);
}

export async function getAllArchiveWeeks(): Promise<{ week_number: number; topic: string; count: number }[]> {
  const map = new Map<number, { topic: string; count: number }>();
  for (const c of _archiveCards) {
    const existing = map.get(c.week_number);
    if (existing) { existing.count++; }
    else { map.set(c.week_number, { topic: c.topic, count: 1 }); }
  }
  return Array.from(map.entries())
    .map(([week_number, { topic, count }]) => ({ week_number, topic, count }))
    .sort((a, b) => a.week_number - b.week_number);
}

export async function markArchiveCard(id: number, status: 'known' | 'unknown' | 'again' | 'hard'): Promise<void> {
  const card = _archiveCards.find(c => c.id === id);
  if (card) card.status = status;
}

export async function getFlashcardReviewForWeek(_weekNumber: number): Promise<FlashcardReview | null> { return null; }

export async function getKnownCardsForWeek(weekNumber: number): Promise<FlashcardArchiveEntry[]> {
  return _archiveCards.filter(c => c.week_number === weekNumber && c.status === 'known');
}

export async function deleteArchiveCardsForWeek(weekNumber: number): Promise<void> {
  _archiveCards = _archiveCards.filter(c => c.week_number !== weekNumber);
}

export async function getMostUnknownTopic(): Promise<string | null> {
  const counts = new Map<string, number>();
  for (const c of _archiveCards) {
    if (c.status === 'unknown') counts.set(c.topic, (counts.get(c.topic) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [topic, count] of counts) {
    if (count > bestCount) { best = topic; bestCount = count; }
  }
  return best;
}

export async function deleteArchiveCard(id: number): Promise<void> {
  _archiveCards = _archiveCards.filter(c => c.id !== id);
}

export async function getArchiveMonths(): Promise<{ month: string; count: number }[]> {
  const map = new Map<string, number>();
  for (const c of _archiveCards) {
    const month = c.created_at.slice(0, 7); // YYYY-MM
    map.set(month, (map.get(month) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getArchiveCardsByMonth(month: string): Promise<FlashcardArchiveEntry[]> {
  return _archiveCards
    .filter(c => c.created_at.startsWith(month))
    .sort((a, b) => a.week_number - b.week_number || a.id - b.id);
}

// ── In-memory activity log ────────────────────────────────────────────────────

let _activityLogs: ActivityLog[] = [];
let _nextLogId = 1;

export async function insertActivityLog(entry: Omit<ActivityLog, 'id'>): Promise<void> {
  _activityLogs = [{ ...entry, id: _nextLogId++ }, ..._activityLogs];
}
export async function getActivityLogInRange(start: string, end: string): Promise<ActivityLog[]> {
  return _activityLogs.filter(l => l.date >= start && l.date <= end);
}
export async function getActivityLogByWeek(weekNumber: number): Promise<ActivityLog[]> {
  return _activityLogs.filter(l => l.week_number === weekNumber);
}
export async function getAllActivityLog(): Promise<ActivityLog[]> {
  return [..._activityLogs];
}

export async function deleteActivityLog(id: number): Promise<void> {
  _activityLogs = _activityLogs.filter(l => l.id !== id);
}

export async function insertOrUpdateWeeklySummary(_: Omit<WeeklySummary, 'id'>): Promise<void> {}
export async function getAllWeeklySummaries(): Promise<WeeklySummary[]> { return []; }

// ── In-memory songs ───────────────────────────────────────────────────────────

let _songs: Song[] = [];
let _nextSongId = 1;

export async function insertSong(song: Omit<Song, 'id'>): Promise<number> {
  const id = _nextSongId++;
  _songs = [{ ...song, id }, ..._songs];
  return id;
}
export async function getAllSongs(): Promise<Song[]> { return [..._songs]; }
export async function deleteSong(id: number): Promise<void> { _songs = _songs.filter(s => s.id !== id); }
export async function updateSong(id: number, song: Omit<Song, 'id' | 'created_at'>): Promise<void> {
  _songs = _songs.map(s => s.id === id ? { ...s, ...song } : s);
}
