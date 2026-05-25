import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import type { FlashcardArchiveEntry } from '@/context/types';
import { deleteArchiveCard, getAllArchiveWeeks, getArchiveCardsForWeek } from '@/lib/db';

const C = {
  bg:         '#15150F',
  sand:       '#CBB77C',
  cardDark:   'rgba(14, 15, 15, 0.88)',
  borderGold: 'rgba(255, 213, 121, 0.13)',
  gold:       '#F7C653',
  olive:      '#9BC76D',
  mutedLight: '#CFC4AE',
  mutedDark:  '#6B5B44',
  textLight:  '#F7E8C0',
  textDark:   '#2C251C',
};

function statusColor(status: FlashcardArchiveEntry['status']): string {
  if (status === 'known') return '#27AE60';
  if (status === 'hard')  return '#E67E22';
  if (status === 'again') return '#C0392B';
  return 'rgba(207,196,174,0.35)'; // unknown
}

function statusLabel(status: FlashcardArchiveEntry['status']): string {
  if (status === 'known') return 'Known';
  if (status === 'hard')  return 'Hard';
  if (status === 'again') return 'Again';
  return 'New';
}

interface WeekSummary { week_number: number; topic: string; count: number }

export default function ArchiveScreen() {
  const [weeks, setWeeks]             = useState<WeekSummary[]>([]);
  const [expanded, setExpanded]       = useState<Set<number>>(new Set());
  const [cardsByWeek, setCardsByWeek] = useState<Record<number, FlashcardArchiveEntry[]>>({});
  const [loading, setLoading]         = useState(true);

  useEffect(() => { loadWeeks(); }, []);

  async function loadWeeks() {
    const w = await getAllArchiveWeeks();
    setWeeks(w);
    setLoading(false);
  }

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

  async function handleDelete(card: FlashcardArchiveEntry) {
    Alert.alert(
      'Delete card?',
      `"${card.english_meaning}" will be permanently removed from the archive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteArchiveCard(card.id);
            setCardsByWeek(prev => ({
              ...prev,
              [card.week_number]: (prev[card.week_number] ?? []).filter(c => c.id !== card.id),
            }));
            setWeeks(prev => prev.map(w =>
              w.week_number === card.week_number ? { ...w, count: w.count - 1 } : w
            ).filter(w => w.count > 0));
          },
        },
      ]
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </Pressable>
          <Text style={s.title}>Past Weeks</Text>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.olive} />
          </View>
        ) : weeks.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyEmoji}>📚</Text>
            <Text style={s.emptyTitle}>No history yet</Text>
            <Text style={s.emptySub}>
              Complete your first week of flashcards to build your vocabulary library.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            {weeks.map(week => {
              const isExpanded = expanded.has(week.week_number);
              const cards = cardsByWeek[week.week_number] ?? [];
              const known = cards.filter(c => c.status === 'known').length;
              return (
                <View key={week.week_number} style={s.weekCard}>
                  <Pressable onPress={() => toggleWeek(week.week_number)} style={s.weekHeader}>
                    <View style={s.weekHeaderLeft}>
                      <Text style={s.weekLabel}>Week {week.week_number}</Text>
                      <Text style={s.weekSub}>
                        {week.topic} · {week.count} cards
                        {isExpanded && cards.length > 0 ? `  ·  ${known} known` : ''}
                      </Text>
                    </View>
                    <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </Pressable>

                  {isExpanded && (
                    <>
                      {cards.length === 0 ? (
                        <ActivityIndicator color={C.olive} style={{ marginVertical: 16 }} />
                      ) : (
                        <>
                          {cards.map(card => (
                            <View key={card.id} style={s.cardRow}>
                              <View style={[s.statusDot, { backgroundColor: statusColor(card.status) }]} />
                              <View style={s.cardText}>
                                <Text style={s.cardArabic}>{card.arabic_script}</Text>
                                <Text style={s.cardTranslit}>{card.transliteration}</Text>
                                <Text style={s.cardEnglish}>{card.english_meaning}</Text>
                              </View>
                              <View style={s.cardRight}>
                                <Text style={[s.statusChip, { color: statusColor(card.status) }]}>
                                  {statusLabel(card.status)}
                                </Text>
                                <Pressable onPress={() => handleDelete(card)} hitSlop={8}>
                                  <Text style={s.deleteBtn}>✕</Text>
                                </Pressable>
                              </View>
                            </View>
                          ))}

                          <Pressable
                            onPress={() => router.push({
                              pathname: '/(tabs)/flashcards',
                              params: { reviewWeek: String(week.week_number) },
                            })}
                            style={s.reviewBtn}
                          >
                            <Text style={s.reviewBtnText}>Review Again</Text>
                          </Pressable>
                        </>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sand },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 16,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: C.mutedDark, fontWeight: '700', fontSize: 15 },
  title: { color: C.textDark, fontSize: 22, fontWeight: '800' },

  scroll: { paddingHorizontal: 16, paddingBottom: 80, gap: 12 },

  emptyEmoji: { fontSize: 48, textAlign: 'center' },
  emptyTitle: { color: C.textDark, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySub:   { color: C.mutedDark, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  weekCard: {
    backgroundColor: C.cardDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderGold,
    overflow: 'hidden',
  },
  weekHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18,
  },
  weekHeaderLeft: { flex: 1, gap: 3 },
  weekLabel: { color: C.gold, fontSize: 16, fontWeight: '700' },
  weekSub:   { color: C.mutedLight, fontSize: 12 },
  chevron:   { color: C.gold, fontSize: 16 },

  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,213,121,0.08)',
    gap: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  cardText: { flex: 1, gap: 2 },
  cardArabic:  { color: C.textLight, fontSize: 18, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  cardTranslit:{ color: C.mutedLight, fontSize: 12, fontStyle: 'italic' },
  cardEnglish: { color: C.mutedLight, fontSize: 13 },
  cardRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  statusChip: { fontSize: 11, fontWeight: '700' },
  deleteBtn:  { color: 'rgba(192,57,43,0.7)', fontSize: 16, fontWeight: '700', padding: 2 },

  reviewBtn: {
    margin: 16, marginTop: 12,
    borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', backgroundColor: C.olive,
  },
  reviewBtnText: { color: C.textDark, fontWeight: '800', fontSize: 15 },
});
