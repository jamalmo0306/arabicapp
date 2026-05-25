import React, { useEffect, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useAppContext } from '@/context/app-context';
import type { PhraseOfDay } from '@/context/types';


function getMilestone(week: number): string {
  if (week <= 3) return 'Learn 10 phrases';
  if (week <= 6) return 'Complete first tutor session';
  if (week <= 9) return 'Watch one scene without subtitles';
  return 'Hold a 5 minute conversation';
}

// Static width for StyleSheet-time calculations only
const { width } = Dimensions.get('window');

// ── Colors (from GPT mockup) ───────────────────────────────────────────────────
const COLORS = {
  bg:          '#15150F',
  cream:       '#F3D99B',
  creamSoft:   'rgba(246, 220, 156, 0.78)',
  cardLight:   'rgba(244, 218, 156, 0.74)',
  cardBrown:   'rgba(75, 48, 25, 0.58)',
  borderGold:  'rgba(218, 168, 64, 0.35)',
  textDark:    '#2C251C',
  textLight:   '#F7E8C0',
  mutedDark:   '#6B5B44',
  mutedLight:  '#CFC4AE',
  olive:       '#9BC76D',
  oliveDark:   '#6E9357',
  gold:        '#F7C653',
  orange:      '#FF8B2A',
  blackGlass:  'rgba(14, 15, 15, 0.78)',
};

const MILESTONE_GOAL = 10;

// ── ProgressCard ───────────────────────────────────────────────────────────────
type ProgressCardProps = {
  icon: string;
  title: string;
  value: string;
  suffix?: string;
  subtitle: string;
  percent?: string;
  dotStates?: boolean[];
  cardStyle?: object;
};

function ProgressCard({ icon, title, value, suffix, subtitle, percent, dotStates, cardStyle }: ProgressCardProps) {
  return (
    <View style={[s.progressCardBase, cardStyle]}>
      <Text style={s.progressTitle}>{icon} {title}</Text>
      <View style={s.progressContentRow}>
        <View>
          <View style={s.valueRow}>
            <Text style={s.progressValue}>{value}</Text>
            {suffix ? <Text style={s.progressSuffix}> {suffix}</Text> : null}
          </View>
          <Text style={s.progressSubtitle}>{subtitle}</Text>
          {dotStates ? (
            <View style={s.darkDotsRow}>
              {dotStates.map((active, i) => (
                <View key={i} style={[s.darkDot, active && s.darkDotActive]} />
              ))}
            </View>
          ) : null}
        </View>
        {percent ? (
          <View style={s.percentCircle}>
            <Text style={s.percentText}>{percent}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ── HomeScreen ─────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { width: dynWidth } = useWindowDimensions();
  const {
    streak,
    xpTotal,
    currentWeekCards,
    settings,
    weekCompleteInfo,
    dismissWeekComplete,
    weekActivityDates,
  } = useAppContext();

  // Phrase of the day: read from persisted settings first, fall back to current week cards
  const phraseCard = useMemo<PhraseOfDay | null>(() => {
    if (settings.phrase_of_day) {
      try { return JSON.parse(settings.phrase_of_day) as PhraseOfDay; } catch { /* fall through */ }
    }
    if (!currentWeekCards.length) return null;
    const c = currentWeekCards[new Date().getDate() % currentWeekCards.length];
    return { arabic_script: c.arabic_script, transliteration: c.transliteration, english_meaning: c.english_meaning };
  }, [settings.phrase_of_day, currentWeekCards]);

  // 7 dots = Mon–Sun of the current calendar week, filled if that date has activity this program week
  const streakDots = useMemo<boolean[]>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      return weekActivityDates.includes(dateStr);
    });
  }, [weekActivityDates]);

  const camelSize = dynWidth * 0.62;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#CBB77C" />

      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          style={s.screen}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── PHRASE OF THE DAY (replaces header) ── */}
          <View style={s.phraseTopCard}>
            <Text style={s.phraseTopLabel}>💬 Phrase of the Day</Text>
            {phraseCard ? (
              <>
                <Text style={s.phraseTopArabic}>{phraseCard.arabic_script}</Text>
                <Text style={s.phraseTopTranslit}>{phraseCard.transliteration}</Text>
                <Text style={s.phraseTopEng}>{phraseCard.english_meaning}</Text>
              </>
            ) : (
              <>
                <Text style={s.phraseTopArabic}>كيف حالك؟</Text>
                <Text style={s.phraseTopTranslit}>Kayf halak?</Text>
                <Text style={s.phraseTopEng}>How are you?</Text>
              </>
            )}
          </View>

          {/* ── HERO ── */}
          <View style={s.hero}>

            {/* Layer 1 — desert background */}
            <View style={s.heroBg}>
              <Image
                source={require('../../desertbackgroud.png')}
                style={{ width: dynWidth, height: 400 }}
                resizeMode="cover"
              />
            </View>

            {/* Layer 2 — camel */}
            <Image
              source={require('../../guyoncamelsprite.png')}
              style={[s.camelSprite, { width: camelSize, height: camelSize }]}
              resizeMode="contain"
            />

            {/* Layer 3 — gradient fades */}
            <LinearGradient
              colors={['#CBB77C', 'transparent']}
              style={s.heroGradientTop}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['transparent', '#CBB77C']}
              style={s.heroGradientBottom}
              pointerEvents="none"
            />

          </View>

          {/* ── QUICK LAUNCH ROW ── */}
          <View style={s.quickRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              style={[s.progressCardBase, s.quickCard]}
              onPress={() =>
                Linking.canOpenURL('duolingo://').then(supported =>
                  Linking.openURL(supported ? 'duolingo://' : 'https://www.duolingo.com')
                )
              }
            >
              <Text style={s.quickEmoji}>🦉</Text>
              <Text style={s.quickTitle}>Duolingo</Text>
              <Text style={s.quickSub}>Continue your streak</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.82}
              style={[s.progressCardBase, s.quickCard]}
              onPress={() =>
                Linking.canOpenURL('lingq://').then(supported =>
                  Linking.openURL(supported ? 'lingq://' : 'https://www.lingq.com')
                )
              }
            >
              <Text style={s.quickEmoji}>📖</Text>
              <Text style={s.quickTitle}>LingQ</Text>
              <Text style={s.quickSub}>Reading practice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.82}
              style={[s.progressCardBase, s.quickCard]}
              onPress={() => Linking.openURL(settings.resource_url)}
            >
              <Text style={s.quickEmoji}>🎬</Text>
              <Text style={s.quickTitle}>{settings.resource_title}</Text>
              <Text style={s.quickSub}>{settings.resource_subtitle}</Text>
            </TouchableOpacity>
          </View>

          {/* ── PROGRESS SECTION ── */}

          {/* Study Streak + Flashcard Progress */}
          <View style={s.progressRow}>
            <ProgressCard
              icon="🔥" title="Study Streak"
              value={`${streak}`}
              subtitle="days in a row"
              dotStates={streakDots}
              cardStyle={s.progressCardHalf}
            />

            {/* Flashcard progress card — Again / Hard / Good */}
            <View style={[s.progressCardHalf, s.progressCardBase]}>
              <Text style={s.progressTitle}>🃏 Week {settings.current_week} Cards</Text>
              <View style={s.fcStatsRow}>
                <View style={s.fcStat}>
                  <Text style={[s.fcStatNum, { color: '#C0392B' }]}>
                    {currentWeekCards.filter(c => c.status === 'again').length}
                  </Text>
                  <Text style={s.fcStatLabel}>Again</Text>
                </View>
                <View style={s.fcDivider} />
                <View style={s.fcStat}>
                  <Text style={[s.fcStatNum, { color: '#E67E22' }]}>
                    {currentWeekCards.filter(c => c.status === 'hard').length}
                  </Text>
                  <Text style={s.fcStatLabel}>Hard</Text>
                </View>
                <View style={s.fcDivider} />
                <View style={s.fcStat}>
                  <Text style={[s.fcStatNum, { color: '#27AE60' }]}>
                    {currentWeekCards.filter(c => c.status === 'known').length}
                  </Text>
                  <Text style={s.fcStatLabel}>Good</Text>
                </View>
              </View>
              <Text style={s.fcTotal}>
                {currentWeekCards.length} cards total
              </Text>
            </View>
          </View>

          {/* ── WEEKLY CHECK-IN ── */}
          <TouchableOpacity
            activeOpacity={0.82}
            style={s.checkInBtn}
            onPress={() => router.push('/(modal)/checkin')}
          >
            <Text style={s.checkInEmoji}>📋</Text>
            <View style={s.checkInText}>
              <Text style={s.checkInTitle}>Weekly Check-In</Text>
              <Text style={s.checkInSub}>Track your week in 60 seconds</Text>
            </View>
            <Text style={s.checkInArrow}>→</Text>
          </TouchableOpacity>

        </ScrollView>

      </SafeAreaView>

      {/* Week complete modal */}
      <Modal
        visible={!!weekCompleteInfo}
        transparent
        animationType="fade"
        onRequestClose={dismissWeekComplete}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalEmoji}>🌿</Text>
            <Text style={s.modalTitle}>
              Week {weekCompleteInfo?.completedWeek} complete!
            </Text>
            <Text style={s.modalBody}>
              Your cards have been archived.{'\n'}Ready for Week {(weekCompleteInfo?.completedWeek ?? 0) + 1}?
            </Text>
            <Pressable onPress={dismissWeekComplete} style={s.modalBtn}>
              <Text style={s.modalBtnText}>Let's go →</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  safe:   { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1, backgroundColor: '#CBB77C' },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140,   // clears the floating bottom nav
  },

  // ─ Phrase of the Day (top card, replaces header) ─
  phraseTopCard: {
    borderRadius: 20,
    backgroundColor: COLORS.cardLight,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 6,
    alignItems: 'center',
    gap: 3,
  },
  phraseTopLabel:   { color: COLORS.mutedDark, fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 2 },
  phraseTopArabic:  { color: COLORS.textDark, fontSize: 24, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl' },
  phraseTopTranslit:{ color: COLORS.textDark, fontSize: 14, textAlign: 'center' },
  phraseTopEng:     { color: COLORS.mutedDark, fontSize: 13, textAlign: 'center' },

  // ─ Hero ─
  hero: {
    height: 400,
    overflow: 'hidden',
    marginBottom: 0,
    marginHorizontal: -16,        // bleed past scrollContent padding to hit screen edges
    backgroundColor: '#D4A84B',
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 400,
  },
  camelSprite: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: '18%',
  },
  heroGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },

  // ─ Progress rows ─
  progressRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  // Shared base card style (used by ProgressCard and Milestone)
  progressCardBase: {
    minHeight: 130,
    borderRadius: 17,
    backgroundColor: COLORS.blackGlass,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 121, 0.13)',
  },
  // 1/3 width — for the top row of 3
  progressCardThird: {
    flex: 1,
  },
  // 1/2 width — for the bottom row of 2
  progressCardHalf: {
    flex: 1,
  },
  progressTitle: { color: COLORS.gold, fontSize: 14, fontWeight: '800', marginBottom: 14 },
  progressContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valueRow:       { flexDirection: 'row', alignItems: 'flex-end' },
  progressValue:  { color: '#FFFFFF', fontSize: 32, fontWeight: '700', lineHeight: 36 },
  progressSuffix: { color: COLORS.mutedLight, fontSize: 16, marginLeft: 4, marginBottom: 3, fontWeight: '700' },
  progressSubtitle: { color: COLORS.mutedLight, fontSize: 13, marginTop: 8 },
  percentCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText:  { color: COLORS.olive, fontSize: 15, fontWeight: '800' },
  darkDotsRow:  { flexDirection: 'row', gap: 7, marginTop: 14 },
  darkDot:      { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.13)' },
  darkDotActive:{ backgroundColor: COLORS.gold },

  // ─ Quick launch row (below hero) ─
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 14,
    gap: 4,
    minHeight: 0,
  },
  quickEmoji: { fontSize: 24 },
  quickTitle: { color: COLORS.gold, fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 15 },
  quickSub:   { color: COLORS.mutedLight, fontSize: 10, textAlign: 'center', lineHeight: 13 },

  // Flashcard progress card (replaces milestone)
  fcStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, flex: 1 },
  fcStat:     { flex: 1, alignItems: 'center', gap: 4 },
  fcStatNum:  { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  fcStatLabel:{ color: COLORS.mutedLight, fontSize: 11, fontWeight: '600' },
  fcDivider:  { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.10)' },
  fcTotal:    { color: COLORS.mutedLight, fontSize: 11, marginTop: 10, textAlign: 'center' },

  // Weekly check-in button
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blackGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(155,199,109,0.35)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 6,
    gap: 14,
  },
  checkInEmoji: { fontSize: 26 },
  checkInText:  { flex: 1, gap: 3 },
  checkInTitle: { color: COLORS.olive, fontSize: 15, fontWeight: '800' },
  checkInSub:   { color: COLORS.mutedLight, fontSize: 12 },
  checkInArrow: { color: COLORS.olive, fontSize: 20, fontWeight: '700' },

  // Week complete modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: '#FAF6ED',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 340,
  },
  modalEmoji: { fontSize: 52, textAlign: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: COLORS.bg, textAlign: 'center' },
  modalBody: { fontSize: 15, color: '#5A4A35', textAlign: 'center', lineHeight: 22 },
  modalBtn: {
    marginTop: 8,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalBtnText: { color: '#FAF6ED', fontWeight: '700', fontSize: 16 },

});
