import type { BadgeDefinition, BadgeKey, PillarKey, UserStats } from '@/context/types';

export const XP = {
  PILLAR: 10,
  FULL_DAY_BONUS: 15,
  FLASHCARD_BATCH: 5,
  WEEKLY_CHECKIN: 20,
  TUTOR_SESSION: 25,
} as const;

export const STREAK_MULTIPLIER_THRESHOLD = 7;
export const STREAK_MULTIPLIER = 2;

export const PILLARS: { key: PillarKey; label: string; emoji: string }[] = [
  { key: 'flashcards', label: 'Flashcards', emoji: '🃏' },
  { key: 'structured', label: 'Structured Study', emoji: '📖' },
  { key: 'speaking', label: 'Speaking', emoji: '🗣️' },
  { key: 'listening', label: 'Listening', emoji: '🎧' },
];

export const BADGE_DEFINITIONS: Record<BadgeKey, BadgeDefinition> = {
  first_step: {
    key: 'first_step',
    emoji: '🟢',
    name: 'First Step',
    description: 'Log your first session',
  },
  week_warrior: {
    key: 'week_warrior',
    emoji: '⚡',
    name: 'Week Warrior',
    description: 'Reach a 7-day streak',
  },
  thirty_day_legend: {
    key: 'thirty_day_legend',
    emoji: '🔥',
    name: '30-Day Legend',
    description: 'Reach a 30-day streak',
  },
  phrase_master: {
    key: 'phrase_master',
    emoji: '📚',
    name: 'Phrase Master',
    description: 'Complete 20 AI flashcard batches',
  },
  tutor_time: {
    key: 'tutor_time',
    emoji: '🎙️',
    name: 'Tutor Time',
    description: 'Log your first tutor session',
  },
  century: {
    key: 'century',
    emoji: '💯',
    name: 'Century',
    description: 'Hit 100 total study minutes',
  },
  conversationalist: {
    key: 'conversationalist',
    emoji: '🗣️',
    name: 'Conversationalist',
    description: 'Hold a 20-min mostly-Arabic conversation (self-reported)',
  },
  full_system: {
    key: 'full_system',
    emoji: '✅',
    name: 'Full System',
    description: 'Complete all four pillars in the same week',
  },
};

export function calculateSessionXp(
  pillarsCompleted: PillarKey[],
  isTutorSession: boolean,
  streakDays: number
): number {
  let xp = pillarsCompleted.length * XP.PILLAR;
  if (pillarsCompleted.length === 4) xp += XP.FULL_DAY_BONUS;
  if (isTutorSession) xp += XP.TUTOR_SESSION;
  return applyStreakMultiplier(xp, streakDays);
}

export function applyStreakMultiplier(xp: number, streakDays: number): number {
  if (streakDays >= STREAK_MULTIPLIER_THRESHOLD) return xp * STREAK_MULTIPLIER;
  return xp;
}

export function checkBadgeUnlocks(
  stats: UserStats,
  existingBadgeKeys: BadgeKey[]
): BadgeKey[] {
  const existing = new Set(existingBadgeKeys);
  const newBadges: BadgeKey[] = [];

  const check = (key: BadgeKey, condition: boolean) => {
    if (condition && !existing.has(key)) newBadges.push(key);
  };

  check('first_step', stats.totalMinutes > 0);
  check('week_warrior', stats.streak >= 7);
  check('thirty_day_legend', stats.streak >= 30);
  check('phrase_master', stats.totalFlashcardBatches >= 20);
  check('tutor_time', stats.tutorSessionCount >= 1);
  check('century', stats.totalMinutes >= 100);
  check('full_system', stats.fullPillarWeeks >= 1);

  return newBadges;
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function toDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function calcNewStreak(
  lastSessionDate: string | null,
  currentStreak: number,
  today: string
): number {
  if (!lastSessionDate) return 1;
  if (lastSessionDate === today) return currentStreak; // already logged today
  const last = new Date(lastSessionDate);
  const cur = new Date(today);
  const diffDays = Math.round((cur.getTime() - last.getTime()) / 86_400_000);
  if (diffDays === 1) return currentStreak + 1; // consecutive day
  return 1; // streak broken — reset
}
