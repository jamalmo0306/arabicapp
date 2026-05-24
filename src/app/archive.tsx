import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { FlashcardArchiveEntry } from '@/context/types';
import { getAllArchiveWeeks, getArchiveCardsForWeek } from '@/lib/db';
import { useTheme } from '@/hooks/use-theme';

interface WeekSummary {
  week_number: number;
  topic: string;
  count: number;
}

export default function ArchiveScreen() {
  const colors = useTheme();
  const [weeks, setWeeks] = useState<WeekSummary[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [cardsByWeek, setCardsByWeek] = useState<Record<number, FlashcardArchiveEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllArchiveWeeks().then(w => {
      setWeeks(w);
      setLoading(false);
    });
  }, []);

  async function toggleWeek(weekNumber: number) {
    const next = new Set(expanded);
    if (next.has(weekNumber)) {
      next.delete(weekNumber);
    } else {
      next.add(weekNumber);
      if (!cardsByWeek[weekNumber]) {
        const cards = await getArchiveCardsForWeek(weekNumber);
        setCardsByWeek(prev => ({ ...prev, [weekNumber]: cards }));
      }
    }
    setExpanded(next);
  }

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.cream }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={{ color: colors.accent, fontWeight: '600' }}>← Back</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={[styles.title, { color: colors.primary }]}>
            Past Weeks
          </ThemedText>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : weeks.length === 0 ? (
          <View style={styles.center}>
            <ThemedText style={styles.emptyEmoji}>📚</ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.primary }}>
              No history yet
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Complete your first week of flashcards to start building your vocabulary library.
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}>
            {weeks.map(week => {
              const isExpanded = expanded.has(week.week_number);
              const cards = cardsByWeek[week.week_number] ?? [];
              return (
                <ThemedView
                  key={week.week_number}
                  type="surface"
                  style={[styles.weekCard, { borderColor: colors.divider }]}>
                  {/* Week header row */}
                  <Pressable onPress={() => toggleWeek(week.week_number)} style={styles.weekHeader}>
                    <View style={styles.weekHeaderLeft}>
                      <ThemedText style={[styles.weekLabel, { color: colors.primary }]}>
                        Week {week.week_number}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {week.topic} · {week.count} cards
                      </ThemedText>
                    </View>
                    <ThemedText style={{ color: colors.accent, fontSize: 18 }}>
                      {isExpanded ? '▲' : '▼'}
                    </ThemedText>
                  </Pressable>

                  {/* Expanded cards list */}
                  {isExpanded && (
                    <>
                      {cards.length === 0 ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.two }} />
                      ) : (
                        <>
                          {cards.map(card => (
                            <View
                              key={card.id}
                              style={[styles.cardRow, { borderTopColor: colors.divider }]}>
                              <View style={styles.cardText}>
                                <ThemedText style={[styles.cardArabic, { color: colors.text }]}>
                                  {card.arabic_script}
                                </ThemedText>
                                <ThemedText type="small" themeColor="textSecondary" style={styles.cardTranslit}>
                                  {card.transliteration}
                                </ThemedText>
                                <ThemedText type="small" style={{ color: colors.text }}>
                                  {card.english_meaning}
                                </ThemedText>
                              </View>
                              <View
                                style={[
                                  styles.statusDot,
                                  { backgroundColor: card.status === 'known' ? '#27AE60' : '#C0392B' },
                                ]}
                              />
                            </View>
                          ))}

                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: '/(tabs)/flashcards',
                                params: { reviewWeek: String(week.week_number) },
                              })
                            }
                            style={[styles.reviewBtn, { backgroundColor: colors.primary }]}>
                            <ThemedText style={styles.reviewBtnText}>
                              Review Again
                            </ThemedText>
                          </Pressable>
                        </>
                      )}
                    </>
                  )}
                </ThemedView>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  backBtn: { paddingVertical: Spacing.one },
  title: { fontSize: 22, fontWeight: '700' },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  emptyEmoji: { fontSize: 48 },
  weekCard: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  weekHeaderLeft: { gap: 2, flex: 1 },
  weekLabel: { fontSize: 16, fontWeight: '700' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.three,
  },
  cardText: { flex: 1, gap: 2 },
  cardArabic: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardTranslit: { fontStyle: 'italic' },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  reviewBtn: {
    margin: Spacing.four,
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  reviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
