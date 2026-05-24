import * as SQLite from 'expo-sqlite';

import type {
  Badge,
  BadgeKey,
  FlashCard,
  FlashcardArchiveEntry,
  FlashcardReview,
  Session,
  UserSettings,
  WeeklyCheckIn,
} from '@/context/types';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  return _db;
}

export async function initDb(): Promise<void> {
  _db = await SQLite.openDatabaseAsync('arabicapp.db');
  await _db.execAsync(`PRAGMA journal_mode = WAL;`);
  await createTables(_db);
}

async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      pillars_completed TEXT NOT NULL DEFAULT '',
      notes TEXT,
      is_tutor_session INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL DEFAULT 0,
      topic TEXT NOT NULL,
      batch_date TEXT NOT NULL,
      cards_known INTEGER NOT NULL DEFAULT 0,
      cards_unknown INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      badge_key TEXT UNIQUE NOT NULL,
      unlocked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT NOT NULL UNIQUE,
      minutes INTEGER,
      pillars TEXT,
      anki_count INTEGER,
      new_sentence TEXT,
      boring_thing TEXT,
      tutor_happened INTEGER DEFAULT 0,
      ai_response TEXT
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      notification_time TEXT DEFAULT '20:00',
      current_week INTEGER DEFAULT 1,
      dark_mode TEXT DEFAULT 'system',
      xp_total INTEGER DEFAULT 0,
      streak_count INTEGER DEFAULT 0,
      last_session_date TEXT,
      last_batch_date TEXT,
      phrase_of_day TEXT,
      phrase_of_day_date TEXT,
      favorite_resource_ids TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      db_version INTEGER DEFAULT 1
    );

    INSERT OR IGNORE INTO user_settings (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS flashcard_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_number INTEGER NOT NULL,
      topic TEXT NOT NULL,
      arabic_script TEXT NOT NULL,
      transliteration TEXT NOT NULL,
      english_meaning TEXT NOT NULL,
      example_situation TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unknown',
      created_at TEXT NOT NULL
    );
  `);

  // Migrations for existing DBs
  for (const col of [
    `ALTER TABLE user_settings ADD COLUMN api_key TEXT DEFAULT '';`,
    `ALTER TABLE user_settings ADD COLUMN last_batch_date TEXT;`,
    `ALTER TABLE flashcard_reviews ADD COLUMN week_number INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE user_settings ADD COLUMN cards_flipped INTEGER DEFAULT 0;`,
    `ALTER TABLE user_settings ADD COLUMN resource_title TEXT DEFAULT 'This Week';`,
    `ALTER TABLE user_settings ADD COLUMN resource_subtitle TEXT DEFAULT 'Learn Arabic with Maha';`,
    `ALTER TABLE user_settings ADD COLUMN resource_url TEXT DEFAULT 'https://www.youtube.com/@LearnArabicwithMaha';`,
  ]) {
    try { await db.execAsync(col); } catch (_) { /* column already exists */ }
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function insertSession(
  session: Omit<Session, 'id'>
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sessions (date, minutes, pillars_completed, notes, is_tutor_session, xp_earned)
     VALUES (?, ?, ?, ?, ?, ?)`,
    session.date,
    session.minutes,
    session.pillars_completed,
    session.notes ?? null,
    session.is_tutor_session,
    session.xp_earned
  );
  return result.lastInsertRowId;
}

export async function getSessionsForWeek(weekStart: string): Promise<Session[]> {
  const db = await getDb();
  return db.getAllAsync<Session>(
    `SELECT * FROM sessions WHERE date >= ? AND date < date(?, '+7 days') ORDER BY date ASC`,
    weekStart,
    weekStart
  );
}

export async function getRecentSessions(limit = 30): Promise<Session[]> {
  const db = await getDb();
  return db.getAllAsync<Session>(
    `SELECT * FROM sessions ORDER BY date DESC LIMIT ?`,
    limit
  );
}

export async function getTotalMinutes(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(minutes), 0) AS total FROM sessions`
  );
  return row?.total ?? 0;
}

export async function getTotalFlashcardBatches(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM flashcard_reviews`
  );
  return row?.total ?? 0;
}

export async function getTutorSessionCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM sessions WHERE is_tutor_session = 1`
  );
  return row?.total ?? 0;
}

// ── Flashcard Reviews ─────────────────────────────────────────────────────────

export async function insertFlashcardReview(
  review: Omit<FlashcardReview, 'id'>
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO flashcard_reviews (week_number, topic, batch_date, cards_known, cards_unknown)
     VALUES (?, ?, ?, ?, ?)`,
    review.week_number,
    review.topic,
    review.batch_date,
    review.cards_known,
    review.cards_unknown
  );
}

// ── Badges ────────────────────────────────────────────────────────────────────

export async function insertBadge(badgeKey: BadgeKey): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO badges (badge_key, unlocked_at) VALUES (?, ?)`,
    badgeKey,
    new Date().toISOString()
  );
}

export async function getAllBadges(): Promise<Badge[]> {
  const db = await getDb();
  return db.getAllAsync<Badge>(`SELECT * FROM badges ORDER BY unlocked_at ASC`);
}

// ── Weekly Check-Ins ──────────────────────────────────────────────────────────

export async function insertCheckIn(
  checkIn: Omit<WeeklyCheckIn, 'id'>
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO weekly_checkins
     (week_start_date, minutes, pillars, anki_count, new_sentence, boring_thing, tutor_happened, ai_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    checkIn.week_start_date,
    checkIn.minutes ?? null,
    checkIn.pillars ?? null,
    checkIn.anki_count ?? null,
    checkIn.new_sentence ?? null,
    checkIn.boring_thing ?? null,
    checkIn.tutor_happened,
    checkIn.ai_response ?? null
  );
}

export async function getCheckInForWeek(weekStart: string): Promise<WeeklyCheckIn | null> {
  const db = await getDb();
  return db.getFirstAsync<WeeklyCheckIn>(
    `SELECT * FROM weekly_checkins WHERE week_start_date = ?`,
    weekStart
  ) ?? null;
}

// ── User Settings ─────────────────────────────────────────────────────────────

export async function getSettings(): Promise<UserSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserSettings & { id: number; db_version: number }>(
    `SELECT * FROM user_settings WHERE id = 1`
  );
  if (!row) throw new Error('user_settings row missing');
  return {
    notification_time: row.notification_time,
    current_week: row.current_week,
    dark_mode: row.dark_mode as UserSettings['dark_mode'],
    xp_total: row.xp_total,
    streak_count: row.streak_count,
    last_session_date: row.last_session_date,
    last_batch_date: row.last_batch_date ?? null,
    phrase_of_day: row.phrase_of_day,
    phrase_of_day_date: row.phrase_of_day_date,
    favorite_resource_ids: row.favorite_resource_ids,
    api_key: row.api_key ?? '',
    cards_flipped: (row.cards_flipped as 0 | 1) ?? 0,
    resource_title: row.resource_title ?? 'This Week',
    resource_subtitle: row.resource_subtitle ?? 'Learn Arabic with Maha',
    resource_url: row.resource_url ?? 'https://www.youtube.com/@LearnArabicwithMaha',
  };
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(patch) as (keyof UserSettings)[];
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => patch[f] ?? null);
  await db.runAsync(
    `UPDATE user_settings SET ${setClause} WHERE id = 1`,
    ...values
  );
}

// ── Flashcard Archive ─────────────────────────────────────────────────────────

export async function insertArchiveCards(
  weekNumber: number,
  topic: string,
  cards: FlashCard[]
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  for (const c of cards) {
    await db.runAsync(
      `INSERT INTO flashcard_archive (week_number, topic, arabic_script, transliteration, english_meaning, example_situation, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'unknown', ?)`,
      weekNumber, topic, c.arabic_script, c.transliteration, c.english_meaning, c.example_situation, now
    );
  }
}

export async function getArchiveCardsForWeek(weekNumber: number): Promise<FlashcardArchiveEntry[]> {
  const db = await getDb();
  return db.getAllAsync<FlashcardArchiveEntry>(
    `SELECT * FROM flashcard_archive WHERE week_number = ? ORDER BY id ASC`,
    weekNumber
  );
}

export async function getAllArchiveWeeks(): Promise<{ week_number: number; topic: string; count: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ week_number: number; topic: string; count: number }>(
    `SELECT week_number, topic, COUNT(*) as count
     FROM flashcard_archive
     GROUP BY week_number
     ORDER BY week_number ASC`
  );
}

export async function markArchiveCard(
  id: number,
  status: 'known' | 'unknown'
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE flashcard_archive SET status = ? WHERE id = ?`,
    status, id
  );
}

export async function getFlashcardReviewForWeek(weekNumber: number): Promise<FlashcardReview | null> {
  const db = await getDb();
  return (
    (await db.getFirstAsync<FlashcardReview>(
      `SELECT * FROM flashcard_reviews WHERE week_number = ? LIMIT 1`,
      weekNumber
    )) ?? null
  );
}

export async function getKnownCardsForWeek(weekNumber: number): Promise<FlashcardArchiveEntry[]> {
  const db = await getDb();
  return db.getAllAsync<FlashcardArchiveEntry>(
    `SELECT * FROM flashcard_archive WHERE week_number = ? AND status = 'known'`,
    weekNumber
  );
}

export async function deleteArchiveCardsForWeek(weekNumber: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM flashcard_archive WHERE week_number = ?`, weekNumber);
}

export async function getMostUnknownTopic(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ topic: string }>(
    `SELECT topic, COUNT(*) as cnt
     FROM flashcard_archive
     WHERE status = 'unknown'
     GROUP BY topic
     ORDER BY cnt DESC
     LIMIT 1`
  );
  return row?.topic ?? null;
}
