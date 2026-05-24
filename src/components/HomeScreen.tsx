import React, { useEffect, useMemo, useState } from 'react';
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
import { PILLARS } from '@/lib/xp';
import type { PillarKey, PhraseOfDay } from '@/context/types';


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

const PILLAR_SUBTITLES: Record<PillarKey, string> = {
  flashcards: 'Review &\npractice',
  structured: 'Lessons &\ngrammar',
  speaking:   'Talk &\nget better',
  listening:  'Train\nyour ear',
};

// ── ProgressCard ───────────────────────────────────────────────────────────────
type ProgressCardProps = {
  icon: string;
  title: string;
  value: string;
  suffix?: string;
  subtitle: string;
  percent?: string;
  dots?: boolean;
  cardStyle?: object;
};

function ProgressCard({ icon, title, value, suffix, subtitle, percent, dots, cardStyle }: ProgressCardProps) {
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
          {dots ? (
            <View style={s.darkDotsRow}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={s.darkDot} />
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
    logSession,
    settings,
    weekCompleteInfo,
    dismissWeekComplete,
  } = useAppContext();

  const [checkedPillars, setCheckedPillars] = useState<Set<PillarKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  // Phrase of the day: read from persisted settings first, fall back to current week cards
  const phraseCard = useMemo<PhraseOfDay | null>(() => {
    if (settings.phrase_of_day) {
      try { return JSON.parse(settings.phrase_of_day) as PhraseOfDay; } catch { /* fall through */ }
    }
    if (!currentWeekCards.length) return null;
    const c = currentWeekCards[new Date().getDate() % currentWeekCards.length];
    return { arabic_script: c.arabic_script, transliteration: c.transliteration, english_meaning: c.english_meaning };
  }, [settings.phrase_of_day, currentWeekCards]);

  function togglePillar(key: PillarKey) {
    setCheckedPillars(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleLogSession() {
    if (checkedPillars.size === 0 || saving) return;
    setSaving(true);
    try {
      await logSession({ minutes: 0, pillars: Array.from(checkedPillars) });
      setCheckedPillars(new Set());
      setJustLogged(true);
      setTimeout(() => setJustLogged(false), 2000);
    } finally {
      setSaving(false);
    }
  }

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

          {/* ── HEADER ── */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <Text style={s.logoIcon}>🌿</Text>
              <Text style={s.appTitle}>Arabic Hub</Text>
            </View>
            <View style={s.xpPill}>
              <Text style={s.xpText}>⭐ {xpTotal} XP</Text>
            </View>
          </View>

          {/* ── TOP STAT CARDS ── */}
          <View style={s.topStatsRow}>

            {/* Streak */}
            <View style={s.streakCard}>
              <Text style={s.flame}>🔥</Text>
              <Text style={s.bigNumber}>{streak}</Text>
              <Text style={s.smallLabelDark}>day streak</Text>
              <View style={s.dotsRow}>
                <View style={[s.dot, s.dotActive]} />
                <View style={s.dot} />
                <View style={s.dot} />
                <View style={s.dot} />
                <View style={s.dot} />
              </View>
            </View>

            {/* Daily Goal */}
            <View style={s.goalCard}>
              <View style={s.goalLeft}>
                <Text style={s.cardTitleDark}>Total XP</Text>
                <Text style={s.goalText}>
                  <Text style={s.goalOrange}>{xpTotal}</Text>
                  <Text style={s.goalText}> XP</Text>
                </Text>
                <View style={s.progressTrackLight}>
                  <View style={[s.progressFill, { width: `${Math.min(100, (xpTotal % 100))}%` }]} />
                </View>
              </View>
              <View style={s.goalDivider} />
              <View style={s.goalDays}>
                <Text style={s.calendarIcon}>🔥</Text>
                <Text style={s.goalDaysNumber}>{streak}</Text>
                <Text style={s.smallLabelDark}>streak</Text>
              </View>
            </View>

            {/* Phrase of the Day */}
            <View style={s.phraseCard}>
              <Text style={s.cardTitleDark}>💬 Phrase of the Day</Text>
              {phraseCard ? (
                <>
                  <Text style={s.arabicText}>{phraseCard.arabic_script}</Text>
                  <Text style={s.translitText}>{phraseCard.transliteration}</Text>
                  <Text style={s.meaningText}>{phraseCard.english_meaning}</Text>
                </>
              ) : (
                <>
                  <Text style={s.arabicText}>كيف حالك؟</Text>
                  <Text style={s.translitText}>Kayf halak?</Text>
                  <Text style={s.meaningText}>How are you?</Text>
                </>
              )}
            </View>

          </View>

          {/* ── HERO ── */}
          <View style={s.hero}>

            {/* Layer 1 — desert background */}
            <View style={s.heroBg}>
              <Image
                source={require('../../desertbackgroud.png')}
                style={{ width: dynWidth, height: 760 }}
                resizeMode="cover"
              />
            </View>

            {/* Layer 2 — camel */}
            <Image
              source={require('../../guyoncamelsprite.png')}
              style={[s.camelSprite, { width: camelSize, height: camelSize }]}
              resizeMode="contain"
            />

            {/* Layer 3 — pillar buttons: tap to mark complete (turns gold) */}
            <View style={s.heroButtonRow}>
              {PILLARS.map(p => {
                const checked = checkedPillars.has(p.key);
                return (
                  <TouchableOpacity
                    key={p.key}
                    activeOpacity={0.82}
                    style={[s.heroButton, checked && s.heroButtonActive]}
                    onPress={() => togglePillar(p.key)}
                  >
                    <Text style={s.heroButtonIcon}>{p.emoji}</Text>
                    <Text style={[s.heroButtonTitle, checked && s.heroButtonTitleActive]}>
                      {p.key === 'structured' ? 'Structured\nStudy' : p.label}
                    </Text>
                    <Text style={s.heroButtonSub}>{PILLAR_SUBTITLES[p.key]}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* Resources navigates — not a loggable pillar */}
              <TouchableOpacity
                activeOpacity={0.82}
                style={s.heroButton}
                onPress={() => router.push('/(tabs)/resources')}
              >
                <Text style={s.heroButtonIcon}>📚</Text>
                <Text style={s.heroButtonTitle}>Resources</Text>
                <Text style={s.heroButtonSub}>Guides &{'\n'}tools</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── PROGRESS SECTION ── */}

          {/* Study Streak + Next Milestone */}
          <View style={s.progressRow}>
            <ProgressCard
              icon="🔥" title="Study Streak"
              value={`${streak}`}
              subtitle="days in a row" dots
              cardStyle={s.progressCardHalf}
            />

            {/* Milestone card */}
            <View style={[s.progressCardHalf, s.progressCardBase]}>
              <View style={s.milestoneTop}>
                <Text style={s.progressTitle}>🏆 Next Milestone</Text>
                <Text style={s.lockIcon}>🔒</Text>
              </View>
              <Text style={s.milestoneMain}>{getMilestone(settings.current_week)}</Text>
              <Text style={s.milestoneSub}>+25 XP</Text>
              <View style={s.milestoneBottom}>
                <View style={s.progressTrackDark}>
                  <View
                    style={[
                      s.progressFillDark,
                      { width: `${Math.min(100, (currentWeekCards.filter(c => c.status === 'known').length / MILESTONE_GOAL) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={s.milestoneCount}>{currentWeekCards.filter(c => c.status === 'known').length} / {MILESTONE_GOAL}</Text>
              </View>
            </View>
          </View>

          {/* ── QUICK LAUNCH ── */}
          <View style={s.quickLaunchRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              style={s.quickCard}
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
              style={s.quickCard}
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
              style={s.quickCard}
              onPress={() => Linking.openURL(settings.resource_url)}
            >
              <Text style={s.quickEmoji}>🎬</Text>
              <Text style={s.quickTitle}>{settings.resource_title}</Text>
              <Text style={s.quickSub}>{settings.resource_subtitle}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Floating log button — appears when any pillar is checked */}
        {(checkedPillars.size > 0 || justLogged) && (
          <TouchableOpacity
            style={[s.logBtn, justLogged && s.logBtnDone]}
            onPress={handleLogSession}
            disabled={saving || justLogged}
            activeOpacity={0.85}
          >
            <Text style={s.logBtnText}>
              {justLogged ? '✓ Logged!' : saving ? 'Logging…' : `✓ Log ${checkedPillars.size} pillar${checkedPillars.size > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        )}
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
    paddingTop: 20,
    paddingBottom: 140,   // clears the floating bottom nav
  },

  // ─ Header ─
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { fontSize: 38, marginRight: 10 },
  appTitle: {
    color: COLORS.textDark,
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  xpPill: {
    minWidth: 104,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: COLORS.creamSoft,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  xpText: { color: COLORS.textDark, fontSize: 18, fontWeight: '800' },

  // ─ Top stat cards ─
  topStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },

  streakCard: {
    width: 96,
    height: 172,
    borderRadius: 22,
    backgroundColor: COLORS.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  flame:        { fontSize: 40, marginBottom: 2 },
  bigNumber:    { color: COLORS.textDark, fontSize: 44, fontWeight: '800', lineHeight: 50 },
  smallLabelDark: { color: COLORS.textDark, fontSize: 14, fontWeight: '500' },
  dotsRow:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  dot:          { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(82, 72, 56, 0.28)' },
  dotActive:    { backgroundColor: COLORS.orange },

  goalCard: {
    flex: 1.3,
    height: 172,
    borderRadius: 22,
    backgroundColor: COLORS.cardLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  goalLeft:        { flex: 1, paddingRight: 12 },
  cardTitleDark:   { color: COLORS.textDark, fontSize: 16, fontWeight: '800', marginBottom: 14 },
  goalText:        { color: COLORS.textDark, fontSize: 20, fontWeight: '700', marginBottom: 14 },
  goalOrange:      { color: '#B86B20' },
  progressTrackLight: {
    height: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 86, 65, 0.24)',
    overflow: 'hidden',
  },
  progressFill:    { height: '100%', backgroundColor: COLORS.orange, borderRadius: 20 },
  goalDivider:     { width: 1, height: 90, backgroundColor: 'rgba(85, 75, 56, 0.17)', marginHorizontal: 12 },
  goalDays:        { width: 52, alignItems: 'center' },
  calendarIcon:    { fontSize: 26, marginBottom: 4 },
  goalDaysNumber:  { color: COLORS.textDark, fontSize: 34, fontWeight: '800', lineHeight: 40 },

  phraseCard: {
    flex: 1,
    height: 172,
    borderRadius: 22,
    backgroundColor: COLORS.cardLight,
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center',
  },
  arabicText:  { color: COLORS.textDark, textAlign: 'center', fontSize: 22, fontWeight: '700', writingDirection: 'rtl', marginTop: 6 },
  translitText: { color: COLORS.textDark, textAlign: 'center', fontSize: 15, marginTop: 6 },
  meaningText:  { color: COLORS.mutedDark, textAlign: 'center', fontSize: 14, marginTop: 2 },

  // ─ Hero ─
  hero: {
    width: '100%',
    height: 760,
    borderRadius: 24,
    overflow: 'hidden',           // clips the 2× wide panning background
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 205, 112, 0.18)',
    backgroundColor: '#E5A749',   // warm fallback if image fails to load
  },
  // Panning background layer — 2× wide, translateX is driven by bgPanStyle
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 760,
  },
  // Camel: width & height come from inline (reactive). Position is percentage-based
  // so it stays at the same spot in the hero no matter the screen width.
  camelSprite: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: '27%',   // 27% of 760 px ≈ 205 px — sits above the button row
  },

  heroButtonRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    height: 160,
    flexDirection: 'row',
    gap: 8,
  },
  heroButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 44, 23, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 221, 145, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  heroButtonIcon:  { fontSize: 28, marginBottom: 8 },
  heroButtonTitle: { color: COLORS.gold, fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 16 },
  heroButtonTitleActive: { color: COLORS.gold },
  heroButtonSub:   { color: '#F1DEBD', fontSize: 11, textAlign: 'center', lineHeight: 15, marginTop: 4 },
  heroButtonActive: {
    backgroundColor: 'rgba(247, 198, 83, 0.30)',
    borderColor: COLORS.gold,
    borderWidth: 1.5,
  },

  // ─ Floating log button ─
  logBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 114,   // clears the 80px nav + 16px gap + 18px buffer
    backgroundColor: COLORS.olive,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 10,
  },
  logBtnDone: { backgroundColor: COLORS.oliveDark },
  logBtnText: { color: '#15150F', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  // ─ Progress rows ─
  progressRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
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

  // Milestone section
  milestoneTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lockIcon:      { fontSize: 16, opacity: 0.75 },
  milestoneMain: { color: '#F7E8D0', fontSize: 22, fontWeight: '600', marginTop: 4 },
  milestoneSub:  { color: COLORS.mutedLight, fontSize: 15, marginTop: 6 },
  milestoneBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  progressTrackDark: {
    flex: 1,
    height: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.13)',
    overflow: 'hidden',
  },
  progressFillDark: { height: '100%', backgroundColor: COLORS.olive, borderRadius: 20 },
  milestoneCount: { color: '#F6EBD1', fontSize: 15, fontWeight: '700', marginLeft: 14 },

  // Quick-launch cards
  quickLaunchRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.blackGlass,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(218,168,64,0.18)',
  },
  quickEmoji: { fontSize: 28 },
  quickTitle: { color: COLORS.textLight, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  quickSub:   { color: COLORS.mutedLight, fontSize: 11, textAlign: 'center', lineHeight: 15 },

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
