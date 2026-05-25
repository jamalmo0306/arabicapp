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

import { useAppContext } from '@/context/app-context';
import type { FlashcardArchiveEntry } from '@/context/types';
import {
  deleteArchiveCard,
  getAllArchiveWeeks,
  getArchiveCardsByMonth,
  getArchiveCardsForWeek,
  getArchiveMonths,
} from '@/lib/db';

const C = {
  bg:         '#15150F',
  sand:       '#CBB77C',
  cardDark:   'rgba(14, 15, 15, 0.88)',
  borderGold: 'rgba(255, 213, 121, 0.13)',
  gold:       '#F7C653',
  goldSoft:   'rgba(247, 198, 83, 0.18)',
  olive:      '#9BC76D',
  oliveDim:   'rgba(118, 147, 70, 0.30)',
  mutedLight: '#CFC4AE',
  mutedDark:  '#6B5B44',
  textLight:  '#F7E8C0',
  textDark:   '#2C251C',
  btnInactive:'rgba(255, 255, 255, 0.07)',
  btnBorder:  'rgba(255, 213, 121, 0.20)',
};

type ViewMode = 'week' | 'month';

function statusColor(status: FlashcardArchiveEntry['status']): string {
  if (status === 'known') return '#27AE60';
  if (status === 'hard')  return '#E67E22';
  if (status === 'again') return '#C0392B';
  return 'rgba(207,196,174,0.35)';
}

function statusLabel(status: FlashcardArchiveEntry['status']): string {
  if (status === 'known') return 'Known';
  if (status === 'hard')  return 'Hard';
  if (status === 'again') return 'Again';
  return 'New';
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

interface WeekSummary { week_number: number; topic: string; count: number }
interface MonthSummary { month: string; count: number }

function CardList({
  cards,
  onDelete,
  weekNumber,
}: {
  cards: FlashcardArchiveEntry[];
  onDelete: (card: FlashcardArchiveEntry) => void;
  weekNumber?: number;
}) {
  return (
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
            <Pressable onPress={() => onDelete(card)} hitSlop={8}>
              <Text style={s.deleteBtn}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {weekNumber !== undefined && cards.length > 0 && (
        <Pressable
          onPress={() => router.push({
            pathname: '/(tabs)/flashcards',
            params: { reviewWeek: String(weekNumber) },
          })}
          style={s.reviewBtn}
        >
          <Text style={s.reviewBtnText}>Review Again</Text>
        </Pressable>
      )}
    </>
  );
}

export default function ArchiveScreen() {
  const { settings } = useAppContext();
  const currentWeek = settings.current_week;

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [loading, setLoading]   = useState(true);

  // Week mode
  const [weeks, setWeeks]           = useState<WeekSummary[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [weekCards, setWeekCards]   = useState<FlashcardArchiveEntry[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Month mode
  const [months, setMonths]               = useState<MonthSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthCards, setMonthCards]       = useState<FlashcardArchiveEntry[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [w, m] = await Promise.all([getAllArchiveWeeks(), getArchiveMonths()]);
    setWeeks(w);
    setMonths(m);
    setLoading(false);
  }

  async function selectWeek(weekNumber: number) {
    if (selectedWeek === weekNumber) {
      setSelectedWeek(null);
      setWeekCards([]);
      return;
    }
    setSelectedWeek(weekNumber);
    setLoadingCards(true);
    const cards = await getArchiveCardsForWeek(weekNumber);
    setWeekCards(cards);
    setLoadingCards(false);
  }

  async function selectMonth(month: string) {
    if (selectedMonth === month) {
      setSelectedMonth(null);
      setMonthCards([]);
      return;
    }
    setSelectedMonth(month);
    setLoadingCards(true);
    const cards = await getArchiveCardsByMonth(month);
    setMonthCards(cards);
    setLoadingCards(false);
  }

  async function handleDelete(card: FlashcardArchiveEntry) {
    Alert.alert(
      'Delete card?',
      `"${card.english_meaning}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteArchiveCard(card.id);
            setWeeks(prev => prev.map(w =>
              w.week_number === card.week_number ? { ...w, count: w.count - 1 } : w
            ).filter(w => w.count > 0));
            setMonths(prev => prev.map(m =>
              ({ ...m, count: m.count - 1 })
            ).filter(m => m.count > 0));
            setWeekCards(prev => prev.filter(c => c.id !== card.id));
            setMonthCards(prev => prev.filter(c => c.id !== card.id));
          },
        },
      ]
    );
  }

  const weeksWithCards = new Set(weeks.map(w => w.week_number));
  const weekMap = new Map(weeks.map(w => [w.week_number, w]));

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </Pressable>
          <Text style={s.title}>Vocabulary Archive</Text>
        </View>

        {/* Mode toggle */}
        <View style={s.toggleRow}>
          <Pressable
            onPress={() => setViewMode('week')}
            style={[s.toggleBtn, viewMode === 'week' && s.toggleBtnActive]}
          >
            <Text style={[s.toggleText, viewMode === 'week' && s.toggleTextActive]}>By Week</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('month')}
            style={[s.toggleBtn, viewMode === 'month' && s.toggleBtnActive]}
          >
            <Text style={[s.toggleText, viewMode === 'month' && s.toggleTextActive]}>By Month</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.olive} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

            {/* ── BY WEEK ── */}
            {viewMode === 'week' && (
              <>
                {weeks.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Text style={s.emptyEmoji}>📚</Text>
                    <Text style={s.emptyTitle}>No history yet</Text>
                    <Text style={s.emptySub}>Import cards and complete sessions to build your archive.</Text>
                  </View>
                ) : (
                  <>
                    <View style={s.card}>
                      <Text style={s.cardSectionLabel}>SELECT WEEK</Text>
                      <View style={s.weekGrid}>
                        {Array.from(
                          { length: Math.max(currentWeek, ...weeks.map(w => w.week_number), 0) },
                          (_, i) => i + 1
                        ).map(w => {
                          const hasCards = weeksWithCards.has(w);
                          const isSelected = selectedWeek === w;
                          return (
                            <Pressable
                              key={w}
                              onPress={() => hasCards ? selectWeek(w) : undefined}
                              style={[
                                s.weekBtn,
                                hasCards && s.weekBtnHasCards,
                                isSelected && s.weekBtnSelected,
                                !hasCards && s.weekBtnEmpty,
                              ]}
                            >
                              <Text style={[
                                s.weekBtnText,
                                hasCards && s.weekBtnTextHasCards,
                                isSelected && s.weekBtnTextSelected,
                              ]}>
                                {w}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {selectedWeek !== null && (
                      <View style={s.cardsCard}>
                        <View style={s.cardsCardHeader}>
                          <Text style={s.cardsCardTitle}>
                            Week {selectedWeek} · {weekMap.get(selectedWeek)?.topic ?? ''}
                          </Text>
                          <Text style={s.cardsCardCount}>
                            {weekCards.length} cards · {weekCards.filter(c => c.status === 'known').length} known
                          </Text>
                        </View>
                        {loadingCards ? (
                          <ActivityIndicator color={C.olive} style={{ marginVertical: 16 }} />
                        ) : (
                          <CardList
                            cards={weekCards}
                            onDelete={handleDelete}
                            weekNumber={selectedWeek}
                          />
                        )}
                      </View>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── BY MONTH ── */}
            {viewMode === 'month' && (
              <>
                {months.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Text style={s.emptyEmoji}>📅</Text>
                    <Text style={s.emptyTitle}>No history yet</Text>
                    <Text style={s.emptySub}>Import cards and complete sessions to build your archive.</Text>
                  </View>
                ) : (
                  months.map(m => {
                    const isSelected = selectedMonth === m.month;
                    const mCards = isSelected ? monthCards : [];
                    const known = mCards.filter(c => c.status === 'known').length;
                    return (
                      <View key={m.month} style={s.monthCard}>
                        <Pressable onPress={() => selectMonth(m.month)} style={s.monthHeader}>
                          <View style={s.monthHeaderLeft}>
                            <Text style={s.monthLabel}>{formatMonth(m.month)}</Text>
                            <Text style={s.monthSub}>
                              {m.count} cards{isSelected && mCards.length > 0 ? `  ·  ${known} known` : ''}
                            </Text>
                          </View>
                          <Text style={s.chevron}>{isSelected ? '▲' : '▼'}</Text>
                        </Pressable>

                        {isSelected && (
                          loadingCards ? (
                            <ActivityIndicator color={C.olive} style={{ marginVertical: 16 }} />
                          ) : (
                            <CardList cards={monthCards} onDelete={handleDelete} />
                          )
                        )}
                      </View>
                    );
                  })
                )}
              </>
            )}

          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sand },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 16,
  },
  backBtn:  { paddingVertical: 4 },
  backText: { color: C.mutedDark, fontWeight: '700', fontSize: 15 },
  title:    { color: C.textDark, fontSize: 22, fontWeight: '800' },

  // Mode toggle
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.cardDark,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: C.gold },
  toggleText:       { color: C.mutedLight, fontWeight: '700', fontSize: 14 },
  toggleTextActive: { color: C.textDark,   fontWeight: '800', fontSize: 14 },

  scroll: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },

  // Week grid
  card: {
    backgroundColor: C.cardDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderGold,
    padding: 16,
    gap: 12,
  },
  cardSectionLabel: {
    color: C.mutedLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekBtn: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.btnBorder,
    backgroundColor: C.btnInactive,
    alignItems: 'center', justifyContent: 'center',
  },
  weekBtnHasCards: {
    backgroundColor: C.oliveDim,
    borderColor: 'rgba(155,199,109,0.45)',
  },
  weekBtnSelected: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  weekBtnEmpty: { opacity: 0.35 },
  weekBtnText:          { color: C.mutedLight, fontSize: 13, fontWeight: '700' },
  weekBtnTextHasCards:  { color: C.olive },
  weekBtnTextSelected:  { color: C.gold },

  // Cards section (week view)
  cardsCard: {
    backgroundColor: C.cardDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderGold,
    overflow: 'hidden',
  },
  cardsCardHeader: { padding: 16, gap: 3 },
  cardsCardTitle:  { color: C.gold, fontSize: 16, fontWeight: '700' },
  cardsCardCount:  { color: C.mutedLight, fontSize: 12 },

  // Month cards
  monthCard: {
    backgroundColor: C.cardDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderGold,
    overflow: 'hidden',
  },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18,
  },
  monthHeaderLeft: { flex: 1, gap: 3 },
  monthLabel: { color: C.gold, fontSize: 16, fontWeight: '700' },
  monthSub:   { color: C.mutedLight, fontSize: 12 },
  chevron:    { color: C.gold, fontSize: 16 },

  // Individual card rows
  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,213,121,0.08)',
    gap: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  cardText:  { flex: 1, gap: 2 },
  cardArabic:   { color: '#F7E8C0', fontSize: 18, fontWeight: '600', textAlign: 'right', writingDirection: 'rtl' },
  cardTranslit: { color: C.mutedLight, fontSize: 12, fontStyle: 'italic' },
  cardEnglish:  { color: C.mutedLight, fontSize: 13 },
  cardRight:    { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  statusChip:   { fontSize: 11, fontWeight: '700' },
  deleteBtn:    { color: 'rgba(192,57,43,0.7)', fontSize: 16, fontWeight: '700', padding: 2 },

  reviewBtn: {
    margin: 16, marginTop: 12,
    borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', backgroundColor: C.olive,
  },
  reviewBtnText: { color: C.textDark, fontWeight: '800', fontSize: 15 },

  // Empty state
  emptyBox:  { alignItems: 'center', gap: 14, paddingVertical: 60, paddingHorizontal: 24 },
  emptyEmoji:{ fontSize: 48, textAlign: 'center' },
  emptyTitle:{ color: C.textDark, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySub:  { color: C.mutedDark, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
