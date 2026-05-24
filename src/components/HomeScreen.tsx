import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

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

// ── Hardcoded data — wire up DB separately ─────────────────────────────────────
const XP_TOTAL          = 0;
const STREAK            = 0;
const DAILY_XP          = 0;
const DAILY_XP_GOAL     = 20;
const DAILY_DAYS        = 0;
const PHRASE_CHUNKS     = 0;
const PHRASE_CHUNKS_MAX = 300;
const LISTENING_STREAK  = 0;
const SPEAKING_MIN      = 0;
const STUDY_STREAK      = 0;
const MILESTONE_NOW     = 0;
const MILESTONE_GOAL    = 10;

// ── HeroButton ─────────────────────────────────────────────────────────────────
type HeroButtonProps = { icon: string; title: string; subtitle: string };

function HeroButton({ icon, title, subtitle }: HeroButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={s.heroButton}>
      <Text style={s.heroButtonIcon}>{icon}</Text>
      <Text style={s.heroButtonTitle}>{title}</Text>
      <Text style={s.heroButtonSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

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

  // Camel: scale size with screen width so it grows with the background image.
  // Position at a fixed % of the hero height — same relative spot every resize.
  const camelSize = dynWidth * 0.62;

  // ── Animation shared values ────────────────────────────────────────────────
  const camelY   = useSharedValue(0);
  const camelRot = useSharedValue(0);
  const bgX      = useSharedValue(0);

  // Camel: vertical bob + rotation sway
  const camelAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: camelY.value },
      { rotate: `${camelRot.value}deg` },
    ],
  }));

  // Background: horizontal pan
  const bgPanStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bgX.value }],
  }));

  useEffect(() => {
    // Bob: 0 → -10 → 0, 1.2 s cycle, infinite
    camelY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 600 }),
        withTiming(0,   { duration: 600 }),
      ),
      -1,
      false,
    );

    // Sway: -2° → +2°, 1.2 s cycle, infinite
    camelRot.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 600 }),
        withTiming(2,  { duration: 600 }),
      ),
      -1,
      false,
    );

    // Pan: 0 → -screenWidth over 14 s, loop (instant reset via duration-0 step)
    bgX.value = withRepeat(
      withSequence(
        withTiming(-dynWidth, { duration: 14000, easing: Easing.linear }),
        withTiming(0,          { duration: 0 }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(camelY);
      cancelAnimation(camelRot);
      cancelAnimation(bgX);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <Text style={s.xpText}>⭐ {XP_TOTAL} XP</Text>
            </View>
          </View>

          {/* ── TOP STAT CARDS ── */}
          <View style={s.topStatsRow}>

            {/* Streak */}
            <View style={s.streakCard}>
              <Text style={s.flame}>🔥</Text>
              <Text style={s.bigNumber}>{STREAK}</Text>
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
                <Text style={s.cardTitleDark}>Daily Goal</Text>
                <Text style={s.goalText}>
                  <Text style={s.goalOrange}>{DAILY_XP}</Text>
                  <Text style={s.goalText}> / {DAILY_XP_GOAL} XP</Text>
                </Text>
                <View style={s.progressTrackLight}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${Math.max(3, (DAILY_XP / DAILY_XP_GOAL) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={s.goalDivider} />
              <View style={s.goalDays}>
                <Text style={s.calendarIcon}>🗓️</Text>
                <Text style={s.goalDaysNumber}>{DAILY_DAYS}</Text>
                <Text style={s.smallLabelDark}>days</Text>
              </View>
            </View>

            {/* Phrase of the Day */}
            <View style={s.phraseCard}>
              <Text style={s.cardTitleDark}>💬 Phrase of the Day</Text>
              <Text style={s.arabicText}>كيف حالك؟</Text>
              <Text style={s.translitText}>Kayf halak?</Text>
              <Text style={s.meaningText}>How are you?</Text>
            </View>

          </View>

          {/* ── HERO ── */}
          <View style={s.hero}>

            {/* Layer 1 — panning desert background (2× screen width) */}
            <Animated.View style={[s.heroBg, bgPanStyle]}>
              <Image
                source={require('../../desertbackgroud.png')}
                style={{ width: dynWidth * 2, height: 760 }}
                resizeMode="cover"
              />
            </Animated.View>

            {/* Layer 2 — camel: bobs & sways, fixed in the hero (does NOT pan) */}
            <Animated.Image
              source={require('../../guyoncamelsprite.png')}
              style={[s.camelSprite, { width: camelSize, height: camelSize }, camelAnimStyle]}
              resizeMode="contain"
            />

            {/* Layer 3 — pillar buttons: fixed at hero bottom (do NOT pan) */}
            <View style={s.heroButtonRow}>
              <HeroButton icon="🃏"  title="Flashcards"       subtitle="Review & practice"   />
              <HeroButton icon="📖"  title="Structured Study" subtitle="Lessons & grammar"   />
              <HeroButton icon="🗣️"  title="Speaking"         subtitle="Talk & get better"   />
              <HeroButton icon="🎧"  title="Listening"        subtitle="Train your ear"      />
              <HeroButton icon="📚"  title="Resources"        subtitle="Guides & tools"      />
            </View>
          </View>

          {/* ── PROGRESS SECTION ── */}

          {/* Row 1: three equal cards */}
          <View style={s.progressRow}>
            <ProgressCard
              icon="✨" title="Phrase Chunks"
              value={`${PHRASE_CHUNKS}`} suffix={`/ ${PHRASE_CHUNKS_MAX}`}
              subtitle="chunks learned" percent="0%"
              cardStyle={s.progressCardThird}
            />
            <ProgressCard
              icon="🎧" title="Listening Streak"
              value={`${LISTENING_STREAK}`}
              subtitle="days in a row" dots
              cardStyle={s.progressCardThird}
            />
            <ProgressCard
              icon="🗣️" title="Speaking Practice"
              value={`${SPEAKING_MIN}`} suffix="min"
              subtitle="this week" percent="0%"
              cardStyle={s.progressCardThird}
            />
          </View>

          {/* Row 2: Study Streak + Next Milestone */}
          <View style={s.progressRow}>
            <ProgressCard
              icon="🔥" title="Study Streak"
              value={`${STUDY_STREAK}`}
              subtitle="days in a row" dots
              cardStyle={s.progressCardHalf}
            />

            {/* Milestone card */}
            <View style={[s.progressCardHalf, s.progressCardBase]}>
              <View style={s.milestoneTop}>
                <Text style={s.progressTitle}>🏆 Next Milestone</Text>
                <Text style={s.lockIcon}>🔒</Text>
              </View>
              <Text style={s.milestoneMain}>Learn 10 phrases</Text>
              <Text style={s.milestoneSub}>+25 XP</Text>
              <View style={s.milestoneBottom}>
                <View style={s.progressTrackDark}>
                  <View
                    style={[
                      s.progressFillDark,
                      { width: `${(MILESTONE_NOW / MILESTONE_GOAL) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={s.milestoneCount}>{MILESTONE_NOW} / {MILESTONE_GOAL}</Text>
              </View>
            </View>
          </View>

        </ScrollView>

        {/* BottomNav is rendered by (tabs)/_layout.tsx — no duplicate here */}
      </SafeAreaView>
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
  heroButtonSub:   { color: '#F1DEBD', fontSize: 11, textAlign: 'center', lineHeight: 15, marginTop: 4 },

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

});
