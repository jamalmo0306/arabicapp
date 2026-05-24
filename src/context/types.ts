export type PillarKey = 'flashcards' | 'structured' | 'speaking' | 'listening';

export type BadgeKey =
  | 'first_step'
  | 'week_warrior'
  | 'thirty_day_legend'
  | 'phrase_master'
  | 'tutor_time'
  | 'century'
  | 'conversationalist'
  | 'full_system';

export interface Session {
  id: number;
  date: string; // YYYY-MM-DD
  minutes: number;
  pillars_completed: string; // comma-separated PillarKey values
  notes: string | null;
  is_tutor_session: 0 | 1;
  xp_earned: number;
}

export interface FlashcardReview {
  id: number;
  week_number: number;
  topic: string;
  batch_date: string; // YYYY-MM-DD
  cards_known: number;
  cards_unknown: number;
}

export interface FlashcardArchiveEntry {
  id: number;
  week_number: number;
  topic: string;
  arabic_script: string;
  transliteration: string;
  english_meaning: string;
  example_situation: string;
  status: 'known' | 'unknown';
  created_at: string; // ISO timestamp
}

export interface Badge {
  id: number;
  badge_key: BadgeKey;
  unlocked_at: string; // ISO timestamp
}

export interface WeeklyCheckIn {
  id: number;
  week_start_date: string; // YYYY-MM-DD (Monday)
  minutes: number | null;
  pillars: string | null;
  anki_count: number | null;
  new_sentence: string | null;
  boring_thing: string | null;
  tutor_happened: 0 | 1;
  ai_response: string | null;
}

export interface UserSettings {
  notification_time: string; // HH:MM
  current_week: number; // 1-12
  dark_mode: 'light' | 'dark' | 'system';
  xp_total: number;
  streak_count: number;
  last_session_date: string | null; // YYYY-MM-DD
  last_batch_date: string | null; // YYYY-MM-DD — when weekly cards were last generated
  phrase_of_day: string | null; // JSON string of PhraseOfDay
  phrase_of_day_date: string | null; // YYYY-MM-DD
  favorite_resource_ids: string; // comma-separated IDs
  api_key: string;
}

export interface FlashCard {
  arabic_script: string;
  transliteration: string;
  english_meaning: string;
  example_situation: string;
}

export interface PhraseOfDay {
  arabic_script: string;
  transliteration: string;
  english_meaning: string;
}

export interface CheckInAnswers {
  minutes: number;
  pillars: string; // comma-separated pillar names
  anki_count: number;
  new_sentence: string;
  boring_thing: string;
  tutor_happened: boolean;
}

export interface UserStats {
  streak: number;
  xpTotal: number;
  totalMinutes: number;
  totalFlashcardBatches: number;
  tutorSessionCount: number;
  fullPillarWeeks: number;
  unlockedBadgeKeys: BadgeKey[];
}

export interface BadgeDefinition {
  key: BadgeKey;
  emoji: string;
  name: string;
  description: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  type: 'app' | 'youtube' | 'podcast' | 'book' | 'website';
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  url: string;
  description: string;
  isFree: boolean;
}

export interface RoadmapWeek {
  week: number;
  title: string;
  focus: string;
  goals: string[];
  milestone: string;
}
