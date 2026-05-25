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
  FlashCard,
  FlashcardArchiveEntry,
  FlashcardReview,
  PillarKey,
  RawImportCard,
  Session,
  UserSettings,
  UserStats,
} from '@/context/types';
import {
  deleteArchiveCardsForWeek,
  getAllBadges,
  getActivityLogByWeek,
  getArchiveCardsForWeek,
  getFlashcardReviewForWeek,
  getKnownCardsForWeek,
  getRecentSessions,
  getSettings,
  getTotalFlashcardBatches,
  getTotalMinutes,
  getTutorSessionCount,
  initDb,
  insertActivityLog,
  insertArchiveCards,
  insertBadge,
  insertCheckIn,
  insertFlashcardReview,
  insertOrUpdateWeeklySummary,
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

interface AppContextValue {
  isDbReady: boolean;
  streak: number;
  xpTotal: number;
  unlockedBadges: Badge[];
  settings: UserSettings;
  pendingCheckIn: boolean;
  currentWeekCards: FlashcardArchiveEntry[];
  weekCompleteInfo: { completedWeek: number } | null;
  weekActivityDates: string[];

  logSession(params: {
    minutes: number;
    pillars: PillarKey[];
    notes?: string;
    isTutorSession?: boolean;
    activityType?: string;
  }): Promise<void>;
  saveFlashcardBatch(review: Omit<FlashcardReview, 'id'>): Promise<void>;
  saveCheckIn(answers: CheckInAnswers, aiResponse: string): Promise<void>;
  patchSettings(patch: Partial<UserSettings>): Promise<void>;
  triggerConfetti(): void;
  refreshStats(): Promise<void>;
  markCard(id: number, status: 'known' | 'unknown' | 'again' | 'hard'): Promise<void>;
  importWeeklyCards(weekNumber: number, rawCards: RawImportCard[]): Promise<void>;
  clearWeekCards(weekNumber: number): Promise<void>;
  dismissWeekComplete(): void;
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
  cards_flipped: 0 as 0 | 1,
  resource_title: 'This Week',
  resource_subtitle: 'Learn Arabic with Maha',
  resource_url: 'https://www.youtube.com/@LearnArabicwithMaha',
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
  const [currentWeekCards, setCurrentWeekCards] = useState<FlashcardArchiveEntry[]>([]);
  const [weekCompleteInfo, setWeekCompleteInfo] = useState<{ completedWeek: number } | null>(null);
  const [weekActivityDates, setWeekActivityDates] = useState<string[]>([]);

  const confettiRef = useRef<{ start: () => void } | null>(null);

  useEffect(() => {
    initDb()
      .then(() => loadState())
      .catch(console.error);
  }, []);

  async function loadState() {
    let [s, badges] = await Promise.all([getSettings(), getAllBadges()]);
    // Reset streak if last session was more than 1 day ago
    if (s.last_session_date) {
      const today = toDateString();
      const diffDays = Math.round(
        (new Date(today).getTime() - new Date(s.last_session_date).getTime()) / 86_400_000
      );
      if (diffDays > 1) {
        await updateSettings({ streak_count: 0 });
        s = { ...s, streak_count: 0 };
      }
    }
    setSettings(s);
    setStreak(s.streak_count);
    setXpTotal(s.xp_total);
    setUnlockedBadges(badges);

    const isSunday = new Date().getDay() === 0;
    const weekStart = getWeekStart();

    let effectiveWeek = s.current_week;

    if (isSunday) {
      const { getCheckInForWeek } = await import('@/lib/db');
      const existing = await getCheckInForWeek(weekStart);
      setPendingCheckIn(!existing);

      // Week advance: if user completed a study session this week and week < 12
      if (s.current_week < 12) {
        const review = await getFlashcardReviewForWeek(s.current_week);
        if (review) {
          const knownCards = await getKnownCardsForWeek(s.current_week);
          const phraseCard = knownCards.length > 0
            ? knownCards[Math.floor(Math.random() * knownCards.length)]
            : null;
          const newWeek = s.current_week + 1;
          await updateSettings({
            current_week: newWeek,
            phrase_of_day: phraseCard
              ? JSON.stringify({
                  arabic_script: phraseCard.arabic_script,
                  transliteration: phraseCard.transliteration,
                  english_meaning: phraseCard.english_meaning,
                })
              : s.phrase_of_day,
            phrase_of_day_date: toDateString(),
          });
          setSettings(prev => ({ ...prev, current_week: newWeek }));
          setWeekCompleteInfo({ completedWeek: s.current_week });
          effectiveWeek = newWeek;

          // Summarise the completed week's activity
          const weekActivities = await getActivityLogByWeek(s.current_week);
          if (weekActivities.length > 0) {
            const totalMins = weekActivities.reduce((sum, a) => sum + (a.minutes || 0), 0);
            const counts: Record<string, number> = {};
            for (const a of weekActivities) counts[a.activity_type] = (counts[a.activity_type] || 0) + 1;
            const mostUsed = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
            await insertOrUpdateWeeklySummary({
              week_number: s.current_week,
              week_start_date: weekStart,
              total_activities: weekActivities.length,
              total_minutes: totalMins,
              most_used_activity: mostUsed,
              notes: null,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    const cards = await getArchiveCardsForWeek(effectiveWeek);
    setCurrentWeekCards(cards);

    const weekLogs = await getActivityLogByWeek(effectiveWeek);
    setWeekActivityDates([...new Set(weekLogs.map(l => l.date))]);

    setIsDbReady(true);
  }

  const importWeeklyCards = useCallback(async (weekNumber: number, rawCards: RawImportCard[]) => {
    const topic = `Week ${weekNumber}`;
    const cards: FlashCard[] = rawCards.map(c => ({
      arabic_script: c.arabic,
      transliteration: c.transliteration,
      english_meaning: c.english,
      example_situation: c.situation,
    }));
    await deleteArchiveCardsForWeek(weekNumber);
    await insertArchiveCards(weekNumber, topic, cards);
    const stored = await getArchiveCardsForWeek(weekNumber);
    const toSet: FlashcardArchiveEntry[] = stored.length > 0
      ? stored
      : cards.map((c, i) => ({
          id: i + 1,
          week_number: weekNumber,
          topic,
          ...c,
          status: 'unknown' as const,
          created_at: new Date().toISOString(),
        }));
    setCurrentWeekCards(toSet);

    if (toSet.length > 0) {
      const phraseCard = toSet[Math.floor(Math.random() * toSet.length)];
      const phraseJson = JSON.stringify({
        arabic_script: phraseCard.arabic_script,
        transliteration: phraseCard.transliteration,
        english_meaning: phraseCard.english_meaning,
      });
      await updateSettings({ phrase_of_day: phraseJson, phrase_of_day_date: toDateString() });
      setSettings(prev => ({ ...prev, phrase_of_day: phraseJson, phrase_of_day_date: toDateString() }));
    }
  }, []);

  const clearWeekCards = useCallback(async (weekNumber: number) => {
    await deleteArchiveCardsForWeek(weekNumber);
    setCurrentWeekCards([]);
  }, []);

  const dismissWeekComplete = useCallback(() => setWeekCompleteInfo(null), []);

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

  const markCard = useCallback(async (id: number, status: 'known' | 'unknown' | 'again' | 'hard') => {
    await dbMarkArchiveCard(id, status);
    setCurrentWeekCards(prev =>
      prev.map(c => (c.id === id ? { ...c, status } : c))
    );
  }, []);

  const logSession = useCallback(
    async ({
      minutes,
      pillars,
      notes,
      isTutorSession = false,
      activityType,
    }: {
      minutes: number;
      pillars: PillarKey[];
      notes?: string;
      isTutorSession?: boolean;
      activityType?: string;
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

      if (activityType) {
        const currentSettings2 = await getSettings();
        await insertActivityLog({
          date: today,
          activity_type: activityType,
          minutes: minutes || null,
          notes: notes || null,
          week_number: currentSettings2.current_week,
          created_at: new Date().toISOString(),
        });
        const weekLogs = await getActivityLogByWeek(currentSettings2.current_week);
        setWeekActivityDates([...new Set(weekLogs.map(l => l.date))]);
      }

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
      const today = toDateString();
      const newStreak = calcNewStreak(currentSettings.last_session_date, currentSettings.streak_count, today);
      const xp = XP.FLASHCARD_BATCH * (newStreak >= 7 ? 2 : 1);
      const newXpTotal = currentSettings.xp_total + xp;
      await updateSettings({ xp_total: newXpTotal, streak_count: newStreak, last_session_date: today });
      setStreak(newStreak);

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
    if ('current_week' in patch && patch.current_week !== undefined) {
      const [cards, weekLogs] = await Promise.all([
        getArchiveCardsForWeek(patch.current_week),
        getActivityLogByWeek(patch.current_week),
      ]);
      setCurrentWeekCards(cards);
      setWeekActivityDates([...new Set(weekLogs.map(l => l.date))]);
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
        currentWeekCards,
        weekCompleteInfo,
        weekActivityDates,
        logSession,
        saveFlashcardBatch,
        saveCheckIn,
        patchSettings,
        triggerConfetti,
        refreshStats,
        markCard,
        importWeeklyCards,
        clearWeekCards,
        dismissWeekComplete,
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
