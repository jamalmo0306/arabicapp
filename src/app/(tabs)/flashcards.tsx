import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FlipCard } from '@/components/ui/flip-card';
import { Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { FlashcardArchiveEntry } from '@/context/types';
import { getArchiveCardsForWeek } from '@/lib/db';
import { useTheme } from '@/hooks/use-theme';

export default function FlashcardsScreen() {
  const colors = useTheme();
  const params = useLocalSearchParams<{ reviewWeek?: string }>();
  const reviewWeek = params.reviewWeek ? parseInt(params.reviewWeek, 10) : null;

  const {
    settings,
    currentWeekCards,
    generatingBatch,
    isDbReady,
    markCard,
    triggerWeeklyGeneration,
    saveFlashcardBatch,
  } = useAppContext();

  const [cards, setCards] = useState<FlashcardArchiveEntry[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [showTranslit, setShowTranslit] = useState(true);
  const [sessionDone, setSessionDone] = useState(false);

  // When reviewing a past week, load those cards; otherwise use current week
  useEffect(() => {
    if (!isDbReady) return;
    if (reviewWeek !== null) {
      getArchiveCardsForWeek(reviewWeek).then(setCards);
    } else {
      setCards(currentWeekCards);
      setCardIndex(0);
      setSessionDone(false);
    }
  }, [isDbReady, reviewWeek, currentWeekCards]);

  // Trigger generation if no cards and key is set
  useEffect(() => {
    const key = settings.api_key || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
    if (isDbReady && !reviewWeek && key && currentWeekCards.length === 0 && !generatingBatch) {
      triggerWeeklyGeneration();
    }
  }, [isDbReady, settings.api_key]);

  function handleMark(status: 'known' | 'unknown') {
    const card = cards[cardIndex];
    markCard(card.id, status);
    if (cardIndex < cards.length - 1) {
      setCardIndex(i => i + 1);
    } else {
      finishSession();
    }
  }

  async function finishSession() {
    setSessionDone(true);
    if (!reviewWeek) {
      const knownCount = cards.filter((_, i) => i < cardIndex).length; // approximate
      await saveFlashcardBatch({
        week_number: settings.current_week,
        topic: cards[0]?.topic ?? '',
        batch_date: new Date().toISOString().slice(0, 10),
        cards_known: cards.filter(c => c.status === 'known').length,
        cards_unknown: cards.filter(c => c.status === 'unknown').length,
      });
    }
  }

  function restart() {
    setCardIndex(0);
    setSessionDone(false);
  }

  // ── No API key ────────────────────────────────────────────────────────────

  if (!isDbReady) {
    return (
      <ThemedView style={[styles.root, styles.center, { backgroundColor: colors.cream }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  const effectiveKey = settings.api_key || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
  if (!effectiveKey && !reviewWeek) {
    return (
      <ThemedView style={[styles.root, styles.center, { backgroundColor: colors.cream }]}>
        <SafeAreaView style={[styles.safe, styles.center]}>
          <View style={styles.centeredCard}>
            <ThemedText style={styles.bigEmoji}>🔑</ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.primary, textAlign: 'center' }}>
              API key needed
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Add your Anthropic API key in Settings to generate your weekly phrases.
            </ThemedText>
            <Pressable
              onPress={() => router.push('/(tabs)/settings')}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.actionBtnText}>Go to Settings</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Generating ────────────────────────────────────────────────────────────

  if (generatingBatch || (cards.length === 0 && !reviewWeek && effectiveKey)) {
    return (
      <ThemedView style={[styles.root, styles.center, { backgroundColor: colors.cream }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.three }}>
          Generating Week {settings.current_week} phrases…
        </ThemedText>
      </ThemedView>
    );
  }

  // ── Empty review week ─────────────────────────────────────────────────────

  if (reviewWeek !== null && cards.length === 0) {
    return (
      <ThemedView style={[styles.root, styles.center, { backgroundColor: colors.cream }]}>
        <SafeAreaView style={[styles.safe, styles.center]}>
          <View style={styles.centeredCard}>
            <ThemedText style={styles.bigEmoji}>📭</ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.primary }}>No cards found</ThemedText>
            <Pressable onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.actionBtnText}>← Go back</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Session done (summary) ────────────────────────────────────────────────

  if (sessionDone) {
    const knownCount = cards.filter(c => c.status === 'known').length;
    const unknownCount = cards.length - knownCount;
    return (
      <ThemedView style={[styles.root, styles.center, { backgroundColor: colors.cream }]}>
        <SafeAreaView style={[styles.safe, styles.center]}>
          <View style={styles.centeredCard}>
            <ThemedText style={styles.bigEmoji}>🌿</ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.primary }}>
              {reviewWeek ? 'Review done!' : `Week ${settings.current_week} done!`}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {knownCount} known · {unknownCount} still learning
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.accent }}>+5 XP earned</ThemedText>
            {reviewWeek ? (
              <Pressable onPress={() => router.back()} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                <ThemedText style={styles.actionBtnText}>← Back to Archive</ThemedText>
              </Pressable>
            ) : (
              <>
                <Pressable onPress={restart} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                  <ThemedText style={styles.actionBtnText}>Study again</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/archive')}
                  style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1.5 }]}>
                  <ThemedText style={[styles.actionBtnText, { color: colors.primary }]}>
                    Past Weeks →
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Study ─────────────────────────────────────────────────────────────────

  const card = cards[cardIndex];
  const topic = cards[0]?.topic ?? '';

  if (!card) return null;

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.cream }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.studyContainer}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {reviewWeek ? `Week ${reviewWeek} — ` : `Week ${settings.current_week} — `}{topic}
            </ThemedText>
            {!reviewWeek && (
              <Pressable onPress={() => router.push('/archive')}>
                <ThemedText type="small" style={{ color: colors.accent }}>Past Weeks →</ThemedText>
              </Pressable>
            )}
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${(cardIndex / cards.length) * 100}%`,
                },
              ]}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.progressLabel}>
            {cardIndex + 1} / {cards.length}
          </ThemedText>

          {/* Flip card — English front, Arabic back */}
          <FlipCard
            front={
              <>
                <ThemedText style={[styles.english, { color: colors.text }]}>
                  {card.english_meaning}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.situation}>
                  {card.example_situation}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Tap to see Arabic
                </ThemedText>
              </>
            }
            back={
              <>
                <ThemedText style={[styles.arabic, { color: colors.text }]}>
                  {card.arabic_script}
                </ThemedText>
                {showTranslit && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.translit}>
                    {card.transliteration}
                  </ThemedText>
                )}
                <Pressable onPress={() => setShowTranslit(v => !v)}>
                  <ThemedText type="small" style={{ color: colors.accent }}>
                    {showTranslit ? 'Hide' : 'Show'} transliteration
                  </ThemedText>
                </Pressable>
              </>
            }
          />

          {/* Known / Unknown buttons */}
          <View style={styles.markRow}>
            <Pressable
              onPress={() => handleMark('unknown')}
              style={[styles.markBtn, { backgroundColor: '#C0392B' }]}>
              <ThemedText style={styles.markBtnText}>✗ Still learning</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => handleMark('known')}
              style={[styles.markBtn, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.markBtnText}>✓ Got it</ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  centeredCard: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    maxWidth: 340,
  },
  bigEmoji: { fontSize: 64 },
  actionBtn: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.one,
    minWidth: 200,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  studyContainer: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: { textAlign: 'center' },
  english: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  situation: { textAlign: 'center', fontStyle: 'italic' },
  arabic: {
    fontSize: 36,
    fontWeight: '600',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  translit: { fontStyle: 'italic', textAlign: 'center' },
  markRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  markBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  markBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
