import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfettiCannon from 'react-native-confetti-cannon';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PillarCheckbox } from '@/components/ui/pillar-checkbox';
import { StreakDisplay } from '@/components/ui/streak-display';
import { XpBadge } from '@/components/ui/xp-badge';
import { Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { PillarKey, PhraseOfDay } from '@/context/types';
import { generatePhraseOfDay } from '@/lib/api';
import { updateSettings, getSettings } from '@/lib/db';
import { toDateString, PILLARS } from '@/lib/xp';
import { useTheme } from '@/hooks/use-theme';

export default function DashboardScreen() {
  const colors = useTheme();
  const { streak, xpTotal, pendingCheckIn, isDbReady, logSession, settings, newBatchReady, dismissNewBatch } = useAppContext();
  const confettiRef = useRef<ConfettiCannon>(null);

  const [checkedPillars, setCheckedPillars] = useState<Set<PillarKey>>(new Set());
  const [phrase, setPhrase] = useState<PhraseOfDay | null>(null);
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load phrase of day
  useEffect(() => {
    if (!isDbReady) return;
    loadPhraseOfDay();
  }, [isDbReady]);

  async function loadPhraseOfDay() {
    const today = toDateString();
    if (settings.phrase_of_day && settings.phrase_of_day_date === today) {
      try {
        setPhrase(JSON.parse(settings.phrase_of_day));
      } catch {}
      return;
    }
    setPhraseLoading(true);
    try {
      if (!settings.api_key) return;
      const p = await generatePhraseOfDay(settings.api_key);
      setPhrase(p);
      await updateSettings({
        phrase_of_day: JSON.stringify(p),
        phrase_of_day_date: today,
      });
    } catch (e) {
      console.warn('Phrase of day failed:', e);
    } finally {
      setPhraseLoading(false);
    }
  }

  function togglePillar(key: PillarKey) {
    setCheckedPillars(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleLogSession() {
    if (checkedPillars.size === 0) return;
    setSaving(true);
    try {
      await logSession({
        minutes: 0,
        pillars: Array.from(checkedPillars),
      });
      confettiRef.current?.start();
      setCheckedPillars(new Set());
    } finally {
      setSaving(false);
    }
  }

  if (!isDbReady) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.cream }]}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title" style={[styles.appTitle, { color: colors.primary }]}>
              🌿 Arabic Hub
            </ThemedText>
            <XpBadge xp={xpTotal} />
          </View>

          {/* Streak */}
          <ThemedView
            type="surface"
            style={[styles.card, { borderColor: colors.divider }]}>
            <StreakDisplay streak={streak} />
          </ThemedView>

          {/* Phrase of the Day */}
          <ThemedView
            type="surface"
            style={[styles.card, styles.phraseCard, { borderColor: colors.accent }]}>
            <View style={styles.phraseHeader}>
              <ThemedText type="smallBold" style={{ color: colors.accent }}>
                🌅 Phrase of the Day
              </ThemedText>
            </View>
            {phraseLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : phrase ? (
              <>
                <ThemedText style={[styles.arabicText, { color: colors.text }]}>
                  {phrase.arabic_script}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.translit}>
                  {phrase.transliteration}
                </ThemedText>
                <ThemedText style={styles.englishText}>
                  {phrase.english_meaning}
                </ThemedText>
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Tap to load phrase
              </ThemedText>
            )}
          </ThemedView>

          {/* Four Pillars */}
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              TODAY'S PILLARS
            </ThemedText>
            <View style={styles.pillars}>
              {PILLARS.map(p => (
                <PillarCheckbox
                  key={p.key}
                  emoji={p.emoji}
                  label={p.label}
                  checked={checkedPillars.has(p.key)}
                  onToggle={() => togglePillar(p.key)}
                />
              ))}
            </View>
          </View>

          {/* New weekly batch banner */}
          {newBatchReady && (
            <Pressable
              onPress={() => { dismissNewBatch(); router.push('/flashcards'); }}
              style={[styles.batchBanner, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <ThemedText style={[styles.batchBannerText, { color: colors.primary }]}>
                New weekly phrases are ready 🌿
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Tap to study →</ThemedText>
            </Pressable>
          )}

          {/* Quick-start Flashcard */}
          <Pressable
            onPress={() => router.push('/flashcards')}
            style={({ pressed }) => [
              styles.flashcardBtn,
              { backgroundColor: pressed ? colors.primary + 'CC' : colors.primary },
            ]}>
            <ThemedText style={styles.flashcardBtnText}>
              🃏 Start Flashcards
            </ThemedText>
          </Pressable>

          {/* Log this session */}
          {checkedPillars.size > 0 && (
            <Pressable
              onPress={handleLogSession}
              disabled={saving}
              style={({ pressed }) => [
                styles.logBtn,
                { backgroundColor: pressed ? colors.accent + 'CC' : colors.accent },
              ]}>
              <ThemedText style={styles.logBtnText}>
                {saving ? 'Saving…' : `✓ Log ${checkedPillars.size} pillar${checkedPillars.size > 1 ? 's' : ''}`}
              </ThemedText>
            </Pressable>
          )}

          {/* Weekly check-in prompt (Sundays only) */}
          {pendingCheckIn && (
            <Pressable
              onPress={() => router.push('/(modal)/checkin')}
              style={[styles.checkinBanner, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <ThemedText style={[styles.checkinText, { color: colors.primary }]}>
                📋 Weekly check-in is ready — takes 2 minutes
              </ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
      <ConfettiCannon
        ref={confettiRef}
        count={80}
        origin={{ x: 200, y: 0 }}
        autoStart={false}
        fadeOut
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1,
    alignItems: 'center',
  },
  phraseCard: {
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1.5,
  },
  phraseHeader: {
    width: '100%',
  },
  arabicText: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'right',
    width: '100%',
    writingDirection: 'rtl',
  },
  translit: {
    fontStyle: 'italic',
  },
  englishText: {
    fontSize: 16,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    fontSize: 11,
  },
  pillars: {
    gap: Spacing.two,
  },
  flashcardBtn: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  flashcardBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  logBtn: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  logBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  checkinBanner: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  checkinText: {
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  batchBanner: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
  },
  batchBannerText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
