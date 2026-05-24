import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  Badge,
  BadgeKey,
  CheckInAnswers,
  FlashcardArchiveEntry,
  FlashcardReview,
  PillarKey,
  Session,
  UserSettings,
  UserStats,
} from '@/context/types';
import {
  getAllBadges,
  getArchiveCardsForWeek,
  getMostUnknownTopic,
  getRecentSessions,
  getSettings,
  getTotalFlashcardBatches,
  getTotalMinutes,
  getTutorSessionCount,
  initDb,
  insertArchiveCards,
  insertBadge,
  insertCheckIn,
  insertFlashcardReview,
  insertSession,
  markArchiveCard as dbMarkArchiveCard,
  updateSettings,
} from '@/lib/db';
import {
  BADGE_DEFINITIONS,
  calcNewStreak,
  calculateSessionXp,
  checkBadgeUnlocks,
  getWeekStart,
  toDateString,
  XP,
} from '@/lib/xp';
import { FLASHCARD_TOPICS } from '@/data/flashcard-topics';

// Week number → topic (1-indexed, wraps after 10 using archive data for 11-12)
function getTopicForWeek(weekNumber: number, fallbackTopic: string | null): string {
  const idx = ((weekNumber - 1) % 10);
  if ((weekNumber === 11 || weekNumber === 12) && fallbackTopic) {
    return fallbackTopic;
  }
  return FLASHCARD_TOPICS[idx] as string;
}

interface AppContextValue {
  isDbReady: boolean;
  streak: number;
  xpTotal: number;
  unlockedBadges: Badge[];
  settings: UserSettings;
  pendingCheckIn: boolean;
  newBatchReady: boolean;
  currentWeekCards: FlashcardArchiveEntry[];
  generatingBatch: boolean;

  logSession(params: {
    minutes: number;
    pillars: PillarKey[];
    notes?: string;
    isTutorSession?: boolean;
  }): Promise<void>;
  saveFlashcardBatch(review: Omit<FlashcardReview, 'id'>): Promise<void>;
  saveCheckIn(answers: CheckInAnswers, aiResponse: string): Promise<void>;
  patchSettings(patch: Partial<UserSettings>): Promise<void>;
  triggerConfetti(): void;
  refreshStats(): Promise<void>;
  markCard(id: number, status: 'known' | 'unknown'): Promise<void>;
  dismissNewBatch(): void;
  triggerWeeklyGeneration(): Promise<void>;
}

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
};

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isDbReady, setIsDbReady] = useState(false);
  const [streak, setStreak] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [pendingCheckIn, setPendingCheckIn] = useState(false);
  const [newBatchReady, setNewBatchReady] = useState(false);
  const [currentWeekCards, setCurrentWeekCards] = useState<FlashcardArchiveEntry[]>([]);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  const confettiRef = useRef<{ start: () => void } | null>(null);

  useEffect(() => {
    initDb()
      .then(() => loadState())
      .catch(console.error);
  }, []);

  async function loadState() {
    const [s, badges] = await Promise.all([getSettings(), getAllBadges()]);
    setSettings(s);
    setStreak(s.streak_count);
    setXpTotal(s.xp_total);
    setUnlockedBadges(badges);

    const isSunday = new Date().getDay() === 0;
    const weekStart = getWeekStart();
    if (isSunday) {
      const { getCheckInForWeek } = await import('@/lib/db');
      const existing = await getCheckInForWeek(weekStart);
      setPendingCheckIn(!existing);
    }

    // Load current week's cards
    const cards = await getArchiveCardsForWeek(s.current_week);
    setCurrentWeekCards(cards);

    // Check if we need to generate a new batch
    const currentWeekStart = getWeekStart();
    const needsGeneration =
      s.api_key &&
      cards.length === 0 &&
      (!s.last_batch_date || s.last_batch_date < currentWeekStart);

    if (needsGeneration) {
      generateBatch(s.current_week, s.api_key);
    }

    setIsDbReady(true);
  }

  async function generateBatch(weekNumber: number, apiKey: string) {
    setGeneratingBatch(true);
    try {
      const { generateFlashcards } = await import('@/lib/api');
      const fallbackTopic = (weekNumber === 11 || weekNumber === 12)
        ? await getMostUnknownTopic()
        : null;
      const topic = getTopicForWeek(weekNumber, fallbackTopic);
      const cards = await generateFlashcards(topic, apiKey);
      await insertArchiveCards(weekNumber, topic, cards);
      await updateSettings({ last_batch_date: toDateString() });
      const stored = await getArchiveCardsForWeek(weekNumber);
      setCurrentWeekCards(stored);
      setSettings(prev => ({ ...prev, last_batch_date: toDateString() }));
      setNewBatchReady(true);
    } catch (e) {
      console.warn('Weekly batch generation failed:', e);
    } finally {
      setGeneratingBatch(false);
    }
  }

  const triggerWeeklyGeneration = useCallback(async () => {
    const s = await getSettings();
    if (!s.api_key) return;
    const cards = await getArchiveCardsForWeek(s.current_week);
    if (cards.length > 0) {
      setCurrentWeekCards(cards);
      return;
    }
    await generateBatch(s.current_week, s.api_key);
  }, []);

  const refreshStats = useCallback(async () => {
    const [s, badges] = await Promise.all([getSettings(), getAllBadges()]);
    setSettings(s);
    setStreak(s.streak_count);
    setXpTotal(s.xp_total);
    setUnlockedBadges(badges);
  }, []);

  const triggerConfetti = useCallback(() => {
    confettiRef.current?.start();
  }, []);

  const markCard = useCallback(async (id: number, status: 'known' | 'unknown') => {
    await dbMarkArchiveCard(id, status);
    setCurrentWeekCards(prev =>
      prev.map(c => (c.id === id ? { ...c, status } : c))
    );
  }, []);

  const dismissNewBatch = useCallback(() => setNewBatchReady(false), []);

  const logSession = useCallback(
    async ({
      minutes,
      pillars,
      notes,
      isTutorSession = false,
    }: {
      minutes: number;
      pillars: PillarKey[];
      notes?: string;
      isTutorSession?: boolean;
    }) => {
      const today = toDateString();
      const currentSettings = await getSettings();

      const newStreak = calcNewStreak(
        currentSettings.last_session_date,
        currentSettings.streak_count,
        today
      );

      const xp = calculateSessionXp(pillars, isTutorSession, newStreak);
      const newXpTotal = currentSettings.xp_total + xp;

      const session: Omit<Session, 'id'> = {
        date: today,
        minutes,
        pillars_completed: pillars.join(','),
        notes: notes ?? null,
        is_tutor_session: isTutorSession ? 1 : 0,
        xp_earned: xp,
      };

      await insertSession(session);
      await updateSettings({
        xp_total: newXpTotal,
        streak_count: newStreak,
        last_session_date: today,
      });

      const [totalMinutes, totalBatches, tutorCount, allBadges] =
        await Promise.all([
          getTotalMinutes(),
          getTotalFlashcardBatches(),
          getTutorSessionCount(),
          getAllBadges(),
        ]);

      const sessions = await getRecentSessions(60);
      const fullPillarWeeks = countFullPillarWeeks(sessions);

      const stats: UserStats = {
        streak: newStreak,
        xpTotal: newXpTotal,
        totalMinutes,
        totalFlashcardBatches: totalBatches,
        tutorSessionCount: tutorCount,
        fullPillarWeeks,
        unlockedBadgeKeys: allBadges.map(b => b.badge_key),
      };

      const newBadgeKeys = checkBadgeUnlocks(stats, stats.unlockedBadgeKeys);
      for (const key of newBadgeKeys) {
        await insertBadge(key);
      }

      setStreak(newStreak);
      setXpTotal(newXpTotal);

      if (newBadgeKeys.length > 0) {
        const updatedBadges = await getAllBadges();
        setUnlockedBadges(updatedBadges);
        triggerConfetti();
      }
    },
    [triggerConfetti]
  );

  const saveFlashcardBatch = useCallback(
    async (review: Omit<FlashcardReview, 'id'>) => {
      await insertFlashcardReview(review);
      const currentSettings = await getSettings();
      const newStreak = currentSettings.streak_count;
      const xp = XP.FLASHCARD_BATCH * (newStreak >= 7 ? 2 : 1);
      const newXpTotal = currentSettings.xp_total + xp;
      await updateSettings({ xp_total: newXpTotal });

      const [totalBatches, allBadges] = await Promise.all([
        getTotalFlashcardBatches(),
        getAllBadges(),
      ]);
      const totalMinutes = await getTotalMinutes();
      const tutorCount = await getTutorSessionCount();
      const sessions = await getRecentSessions(60);
      const stats: UserStats = {
        streak: newStreak,
        xpTotal: newXpTotal,
        totalMinutes,
        totalFlashcardBatches: totalBatches,
        tutorSessionCount: tutorCount,
        fullPillarWeeks: countFullPillarWeeks(sessions),
        unlockedBadgeKeys: allBadges.map(b => b.badge_key),
      };
      const newBadgeKeys = checkBadgeUnlocks(stats, stats.unlockedBadgeKeys);
      for (const key of newBadgeKeys) await insertBadge(key);
      if (newBadgeKeys.length > 0) {
        setUnlockedBadges(await getAllBadges());
        triggerConfetti();
      }

      setXpTotal(newXpTotal);
    },
    [triggerConfetti]
  );

  const saveCheckIn = useCallback(
    async (answers: CheckInAnswers, aiResponse: string) => {
      const weekStart = getWeekStart();
      await insertCheckIn({
        week_start_date: weekStart,
        minutes: answers.minutes,
        pillars: answers.pillars,
        anki_count: answers.anki_count,
        new_sentence: answers.new_sentence,
        boring_thing: answers.boring_thing,
        tutor_happened: answers.tutor_happened ? 1 : 0,
        ai_response: aiResponse,
      });

      const currentSettings = await getSettings();
      const newStreak = currentSettings.streak_count;
      const xp = XP.WEEKLY_CHECKIN * (newStreak >= 7 ? 2 : 1);
      await updateSettings({ xp_total: currentSettings.xp_total + xp });
      setXpTotal(currentSettings.xp_total + xp);
      setPendingCheckIn(false);
    },
    []
  );

  const patchSettings = useCallback(async (patch: Partial<UserSettings>) => {
    await updateSettings(patch);
    setSettings(prev => ({ ...prev, ...patch }));
    // If API key was just added and we have no cards, trigger generation
    if (patch.api_key && patch.api_key.trim()) {
      const s = await getSettings();
      const cards = await getArchiveCardsForWeek(s.current_week);
      if (cards.length === 0) {
        generateBatch(s.current_week, patch.api_key.trim());
      }
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        isDbReady,
        streak,
        xpTotal,
        unlockedBadges,
        settings,
        pendingCheckIn,
        newBatchReady,
        currentWeekCards,
        generatingBatch,
        logSession,
        saveFlashcardBatch,
        saveCheckIn,
        patchSettings,
        triggerConfetti,
        refreshStats,
        markCard,
        dismissNewBatch,
        triggerWeeklyGeneration,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function countFullPillarWeeks(sessions: Session[]): number {
  const weekMap = new Map<string, Set<string>>();
  for (const s of sessions) {
    const week = getWeekStart(new Date(s.date));
    if (!weekMap.has(week)) weekMap.set(week, new Set());
    s.pillars_completed.split(',').filter(Boolean).forEach(p => weekMap.get(week)!.add(p));
  }
  let count = 0;
  for (const pillars of weekMap.values()) {
    if (['flashcards', 'structured', 'speaking', 'listening'].every(p => pillars.has(p))) {
      count++;
    }
  }
  return count;
}

export { AppContext, BADGE_DEFINITIONS };
