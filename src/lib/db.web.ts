// Web stub — expo-sqlite's WASM build is not bundled in this setup.
// All reads return empty/default values; all writes are no-ops.
// The app renders fully on web for UI preview purposes.

import type {
  ActivityLog,
  Badge,
  BadgeKey,
  FlashCard,
  FlashcardArchiveEntry,
  FlashcardReview,
  Session,
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

export async function insertArchiveCards(_weekNumber: number, _topic: string, _cards: FlashCard[]): Promise<void> {}
export async function getArchiveCardsForWeek(_weekNumber: number): Promise<FlashcardArchiveEntry[]> { return []; }
export async function getAllArchiveWeeks(): Promise<{ week_number: number; topic: string; count: number }[]> { return []; }
export async function markArchiveCard(_id: number, _status: 'known' | 'unknown' | 'again' | 'hard'): Promise<void> {}
export async function getFlashcardReviewForWeek(_weekNumber: number): Promise<FlashcardReview | null> { return null; }
export async function getKnownCardsForWeek(_weekNumber: number): Promise<FlashcardArchiveEntry[]> { return []; }
export async function deleteArchiveCardsForWeek(_weekNumber: number): Promise<void> {}
export async function getMostUnknownTopic(): Promise<string | null> { return null; }
export async function deleteArchiveCard(_id: number): Promise<void> {}

export async function insertActivityLog(_: Omit<ActivityLog, 'id'>): Promise<void> {}
export async function getActivityLogInRange(_start: string, _end: string): Promise<ActivityLog[]> { return []; }
export async function getActivityLogByWeek(_weekNumber: number): Promise<ActivityLog[]> { return []; }
export async function getAllActivityLog(): Promise<ActivityLog[]> { return []; }

export async function insertOrUpdateWeeklySummary(_: Omit<WeeklySummary, 'id'>): Promise<void> {}
export async function getAllWeeklySummaries(): Promise<WeeklySummary[]> { return []; }
