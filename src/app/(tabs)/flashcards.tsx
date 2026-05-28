import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { AppColors } from '@/lib/theme';
import type { FlashcardArchiveEntry, RawImportCard } from '@/context/types';
import { getArchiveCardsForWeek } from '@/lib/db';

const AGAIN_COLOR = '#C0392B';
const HARD_COLOR  = '#E67E22';
const GOOD_COLOR  = '#27AE60';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function FlashcardsScreen() {
  const params = useLocalSearchParams<{ reviewWeek?: string }>();
  const reviewWeek = params.reviewWeek ? parseInt(params.reviewWeek, 10) : null;

  const {
    settings,
    currentWeekCards,
    isDbReady,
    markCard,
    saveFlashcardBatch,
    importWeeklyCards,
    clearWeekCards,
    patchSettings,
    colors,
  } = useAppContext();

  const C = colors;
  const s = useMemo(() => makeStyles(C), [C]);

  const arabicFirst = settings.cards_flipped === 1;

  const [allCards, setAllCards] = useState<FlashcardArchiveEntry[]>([]);
  const [queue, setQueue] = useState<FlashcardArchiveEntry[]>([]);
  const [goodIds, setGoodIds] = useState<Set<number>>(new Set());
  const [sessionCardIndex, setSessionCardIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [history, setHistory] = useState<{ queue: FlashcardArchiveEntry[]; goodIds: Set<number> }[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importing, setImporting] = useState(false);

  const loadedCardIdsRef = useRef<string>('');

  useEffect(() => {
    if (!isDbReady) return;
    if (reviewWeek !== null) {
      getArchiveCardsForWeek(reviewWeek).then(cards => {
        setAllCards(cards);
        setQueue(shuffle([...cards]));
        setGoodIds(new Set());
        setSessionCardIndex(0);
        setSessionDone(false);
        setHistory([]);
      });
    } else {
      const newIds = currentWeekCards.map(c => c.id).sort().join(',');
      if (newIds === loadedCardIdsRef.current) return;
      loadedCardIdsRef.current = newIds;
      setAllCards(currentWeekCards);
      setQueue([...currentWeekCards]);
      setGoodIds(new Set());
      setSessionCardIndex(0);
      setSessionDone(false);
      setHistory([]);
    }
  }, [isDbReady, reviewWeek, currentWeekCards]);

  function rate(rating: 'again' | 'hard' | 'good') {
    const current = queue[0];
    if (!current) return;
    const rest = queue.slice(1);

    setHistory(h => [...h, { queue, goodIds }]);

    if (rating === 'good') {
      markCard(current.id, 'known');
      const newGood = new Set(goodIds);
      newGood.add(current.id);
      setGoodIds(newGood);
      if (rest.length === 0) { endSession(newGood); return; }
      setQueue(rest);
    } else if (rating === 'hard') {
      markCard(current.id, 'hard');
      setQueue([...rest, current]);
    } else {
      markCard(current.id, 'again');
      const at = Math.min(2, rest.length);
      const next = [...rest];
      next.splice(at, 0, current);
      setQueue(next);
    }
    setSessionCardIndex(i => i + 1);
  }

  function goBack() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setQueue(prev.queue);
    setGoodIds(prev.goodIds);
    setSessionCardIndex(i => Math.max(0, i - 1));
  }

  async function endSession(finalGood: Set<number>) {
    setSessionDone(true);
    if (!reviewWeek) {
      await saveFlashcardBatch({
        week_number: settings.current_week,
        topic: allCards[0]?.topic ?? '',
        batch_date: new Date().toISOString().slice(0, 10),
        cards_known: finalGood.size,
        cards_unknown: allCards.length - finalGood.size,
      });
    }
  }

  function restart() {
    setQueue(shuffle([...allCards]));
    setGoodIds(new Set());
    setSessionCardIndex(0);
    setSessionDone(false);
    setHistory([]);
  }

  async function clearCards() {
    setShowClearConfirm(false);
    await clearWeekCards(settings.current_week);
  }

  function toggleOrientation() {
    patchSettings({ cards_flipped: arabicFirst ? 0 : 1 });
  }

  async function handleLoadCards() {
    setImportError('');
    setImportSuccess('');
    setImporting(true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(importText.trim());
    } catch {
      setImportError('Invalid JSON — check your input and try again.');
      setImporting(false);
      return;
    }
    try {
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setImportError('JSON must be a non-empty array.');
        setImporting(false);
        return;
      }
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i] as Record<string, unknown>;
        const missing = ['english', 'arabic', 'transliteration', 'situation'].filter(
          f => !item[f] || typeof item[f] !== 'string'
        );
        if (missing.length > 0) {
          setImportError(`Item ${i + 1} is missing: ${missing.join(', ')}`);
          setImporting(false);
          return;
        }
      }
      await importWeeklyCards(settings.current_week, parsed as RawImportCard[]);
      loadedCardIdsRef.current = '';
      setSessionDone(false);
      setImportSuccess(`${parsed.length} cards loaded for Week ${settings.current_week}`);
      setImportText('');
      setTimeout(() => { setShowImport(false); setImportSuccess(''); }, 1500);
    } catch (e) {
      setImportError(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  }

  function openImport() {
    setImportText(''); setImportError(''); setImportSuccess('');
    setShowImport(true);
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!isDbReady) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={C.olive} />
      </View>
    );
  }

  if (reviewWeek !== null && allCards.length === 0) {
    return (
      <View style={s.root}>
        <SafeAreaView style={[s.safe, s.center]}>
          <View style={s.centeredCard}>
            <Text style={s.bigEmoji}>📭</Text>
            <Text style={s.emptyTitle}>No cards found</Text>
            <Pressable onPress={() => router.back()} style={s.actionBtnPrimary}>
              <Text style={s.actionBtnText}>← Go back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!reviewWeek && allCards.length === 0) {
    return (
      <View style={s.root}>
        <SafeAreaView style={s.safe}>
          <TopBar
            label={`Week ${settings.current_week}`}
            arabicFirst={arabicFirst}
            onToggle={toggleOrientation}
            onImport={openImport}
            s={s}
            C={C}
          />
          <View style={[s.emptyFlex, s.center]}>
            <View style={s.centeredCard}>
              <Text style={s.bigEmoji}>📋</Text>
              <Text style={s.emptyTitle}>No cards yet</Text>
              <Text style={s.emptySub}>
                Tap "Import +" to paste your weekly phrases and start studying.
              </Text>
            </View>
          </View>
        </SafeAreaView>
        <ImportModal
          visible={showImport}
          text={importText}
          error={importError}
          success={importSuccess}
          loading={importing}
          onChangeText={setImportText}
          onLoad={handleLoadCards}
          onCancel={() => setShowImport(false)}
          s={s}
          C={C}
        />
      </View>
    );
  }

  // ── Session done ──────────────────────────────────────────────────────────

  if (sessionDone) {
    return (
      <View style={s.root}>
        <SafeAreaView style={[s.safe, s.center]}>
          <View style={s.completionCard}>
            <Text style={s.bigEmoji}>🌿</Text>
            <Text style={s.completionArabic}>أحسنت!</Text>
            <Text style={s.completionTitle}>
              {reviewWeek ? 'Review done!' : 'Session complete!'}
            </Text>
            <Text style={s.completionSub}>
              {goodIds.size} / {allCards.length} mastered this session
            </Text>
            <Text style={s.completionHint}>Keep it up — you're building real Arabic</Text>
            <Pressable onPress={restart} style={[s.actionBtnPrimary, { marginTop: Spacing.two }]}>
              <Text style={s.actionBtnText}>Review Again</Text>
            </Pressable>
            <Pressable
              onPress={() => reviewWeek ? router.back() : router.replace('/')}
              style={s.actionBtnSecondary}>
              <Text style={[s.actionBtnText, { color: C.textDark }]}>Done</Text>
            </Pressable>
            {!reviewWeek && (
              <>
                <Pressable onPress={() => router.push('/archive')}>
                  <Text style={s.archiveLink}>Past Weeks →</Text>
                </Pressable>
                <Pressable onPress={openImport} style={s.importBtn}>
                  <Text style={s.importBtnText}>Import new cards +</Text>
                </Pressable>
              </>
            )}
          </View>
        </SafeAreaView>
        <ImportModal
          visible={showImport}
          text={importText}
          error={importError}
          success={importSuccess}
          loading={importing}
          onChangeText={setImportText}
          onLoad={handleLoadCards}
          onCancel={() => setShowImport(false)}
          s={s}
          C={C}
        />
      </View>
    );
  }

  // ── Study ─────────────────────────────────────────────────────────────────

  const currentCard = queue[0];
  if (!currentCard) return null;

  const topic = allCards[0]?.topic ?? '';
  const mastered = goodIds.size;
  const total = allCards.length;

  const englishFace = (
    <View style={s.faceContainer}>
      <Text style={s.englishMain}>{currentCard.english_meaning}</Text>
      <Text style={s.situationText}>{currentCard.example_situation}</Text>
    </View>
  );

  const arabicFace = (
    <View style={s.faceContainer}>
      <Text style={s.backEnglish}>{currentCard.english_meaning}</Text>
      <Text style={s.arabicMain}>{currentCard.arabic_script}</Text>
      <Text style={s.translitText}>{currentCard.transliteration}</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <TopBar
          label={reviewWeek
            ? `Week ${reviewWeek} · ${topic}`
            : `Week ${settings.current_week} · ${topic}`}
          arabicFirst={arabicFirst}
          onToggle={toggleOrientation}
          onImport={!reviewWeek ? openImport : undefined}
          onArchive={!reviewWeek ? () => router.push('/archive') : undefined}
          onClear={!reviewWeek ? () => setShowClearConfirm(true) : undefined}
          s={s}
          C={C}
        />

        <View style={s.progressSection}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(mastered / total) * 100}%` }]} />
          </View>
          <Text style={s.progressLabel}>
            Card {sessionCardIndex + 1} · {mastered} / {total} mastered
          </Text>
        </View>

        <StudyCard
          key={`${currentCard.id}-${sessionCardIndex}`}
          front={arabicFirst ? arabicFace : englishFace}
          back={arabicFirst ? englishFace : arabicFace}
          frontDark={arabicFirst}
          onRate={rate}
          onBack={goBack}
          canGoBack={history.length > 0}
          s={s}
        />
      </SafeAreaView>

      <ImportModal
        visible={showImport}
        text={importText}
        error={importError}
        success={importSuccess}
        loading={importing}
        onChangeText={setImportText}
        onLoad={handleLoadCards}
        onCancel={() => setShowImport(false)}
        s={s}
        C={C}
      />
      <Modal visible={showClearConfirm} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmSheet}>
            <Text style={s.confirmTitle}>Clear Week {settings.current_week} cards?</Text>
            <Text style={s.confirmSub}>
              This permanently removes all cards for this week from your archive.
            </Text>
            <View style={s.confirmActions}>
              <Pressable onPress={() => setShowClearConfirm(false)} style={s.actionBtnSecondary}>
                <Text style={[s.actionBtnText, { color: C.textDark }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={clearCards} style={[s.actionBtnPrimary, { backgroundColor: AGAIN_COLOR }]}>
                <Text style={s.actionBtnText}>Clear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────────

function TopBar({
  label, arabicFirst, onToggle, onImport, onArchive, onClear, s, C,
}: {
  label: string;
  arabicFirst: boolean;
  onToggle: () => void;
  onImport?: () => void;
  onArchive?: () => void;
  onClear?: () => void;
  s: ReturnType<typeof makeStyles>;
  C: AppColors;
}) {
  return (
    <View style={s.topBar}>
      <Text style={s.topBarLabel} numberOfLines={1}>{label}</Text>
      <View style={s.topBarRight}>
        {onArchive && (
          <Pressable onPress={onArchive}>
            <Text style={s.archiveLink}>Archive →</Text>
          </Pressable>
        )}
        {onClear && (
          <Pressable onPress={onClear} style={s.clearBtn}>
            <Text style={s.clearBtnText}>Clear</Text>
          </Pressable>
        )}
        {onImport && (
          <Pressable onPress={onImport} style={s.importBtn}>
            <Text style={s.importBtnText}>Import +</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onToggle}
          style={[s.swapBtn, arabicFirst && s.swapBtnActive]}
          accessibilityLabel={arabicFirst ? 'Show English first' : 'Show Arabic first'}
        >
          <Text style={[s.swapIcon, arabicFirst && { color: C.textLight }]}>⇄</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── StudyCard ─────────────────────────────────────────────────────────────────

function StudyCard({
  front, back, frontDark, onRate, onBack, canGoBack, s,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  frontDark: boolean;
  onRate: (r: 'again' | 'hard' | 'good') => void;
  onBack: () => void;
  canGoBack: boolean;
  s: ReturnType<typeof makeStyles>;
}) {
  const [flipped, setFlipped] = useState(false);
  const { height: screenHeight } = useWindowDimensions();
  const cardHeight = Math.round(screenHeight * 0.46);

  const frontFaceStyle = frontDark ? s.cardFaceDark : s.cardFaceLight;
  const backFaceStyle  = frontDark ? s.cardFaceLight : s.cardFaceDark;

  return (
    <View style={s.studyArea}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => setFlipped(f => !f)}
        style={[s.cardContainer, { height: cardHeight }]}
      >
        <View style={[s.cardFace, flipped ? backFaceStyle : frontFaceStyle]}>
          {flipped ? back : front}
        </View>
      </TouchableOpacity>

      {flipped ? (
        <View style={s.ratingRow}>
          <RatingBtn label="Again" sub="↺" color={AGAIN_COLOR} onPress={() => onRate('again')} s={s} />
          <RatingBtn label="Hard"  sub="~" color={HARD_COLOR}  onPress={() => onRate('hard')} s={s} />
          <RatingBtn label="Good"  sub="✓" color={GOOD_COLOR}  onPress={() => onRate('good')} s={s} />
        </View>
      ) : (
        <TouchableOpacity onPress={() => setFlipped(true)} style={s.showAnswerBtn} activeOpacity={0.85}>
          <Text style={s.showAnswerText}>Show Answer</Text>
        </TouchableOpacity>
      )}

      {canGoBack && (
        <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── RatingBtn ─────────────────────────────────────────────────────────────────

function RatingBtn({ label, sub, color, onPress, s }: {
  label: string; sub: string; color: string; onPress: () => void;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.ratingBtn, { backgroundColor: color }]}>
      <Text style={s.ratingBtnSub}>{sub}</Text>
      <Text style={s.ratingBtnLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── ImportModal ───────────────────────────────────────────────────────────────

function ImportModal({
  visible, text, error, success, loading, onChangeText, onLoad, onCancel, s, C,
}: {
  visible: boolean; text: string; error: string; success: string; loading: boolean;
  onChangeText: (t: string) => void; onLoad: () => void; onCancel: () => void;
  s: ReturnType<typeof makeStyles>;
  C: AppColors;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalSheet}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={s.modalBody}
          >
            <Text style={s.modalTitle}>Paste Weekly Cards</Text>
            <Text style={s.modalSub}>
              JSON array — each item needs: english, arabic, transliteration, situation.
            </Text>
            <TextInput
              style={[s.jsonInput, error ? s.jsonInputError : null]}
              multiline
              scrollEnabled
              placeholder={'[\n  {\n    "english": "How are you?",\n    "arabic": "كيف حالك؟",\n    "transliteration": "kayf ḥalak?",\n    "situation": "Greeting a friend"\n  }\n]'}
              placeholderTextColor={C.mutedDark}
              value={text}
              onChangeText={onChangeText}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {!!error   && <Text style={s.importError}>{error}</Text>}
            {!!success && <Text style={s.importSuccess}>✓ {success}</Text>}
            <View style={s.modalActions}>
              <Pressable onPress={onCancel} style={s.actionBtnSecondary}>
                <Text style={[s.actionBtnText, { color: C.textDark }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onLoad}
                disabled={loading || !text.trim()}
                style={[s.actionBtnPrimary, (loading || !text.trim()) && { opacity: 0.45 }]}>
                {loading
                  ? <ActivityIndicator size="small" color={C.textLight} />
                  : <Text style={s.actionBtnText}>Load Cards</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.scrollBg },
    safe: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center' },
    emptyFlex: { flex: 1 },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      gap: 8,
    },
    topBarLabel: { flex: 1, color: C.mutedDark, fontSize: 13, fontWeight: '600' },
    topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    archiveLink: { color: C.gold, fontSize: 13, fontWeight: '700' },
    importBtn: { backgroundColor: C.blackGlass, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    importBtnText: { color: C.textLight, fontWeight: '700', fontSize: 12 },
    swapBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: C.cardLight,
      borderWidth: 1, borderColor: C.borderGold,
      alignItems: 'center', justifyContent: 'center',
    },
    swapBtnActive: { backgroundColor: C.blackGlass },
    swapIcon: { fontSize: 17, fontWeight: '700', color: C.textDark },

    progressSection: { paddingHorizontal: 16, gap: 6, marginBottom: 8 },
    progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(44,37,28,0.18)', overflow: 'hidden' },
    progressFill:  { height: '100%', borderRadius: 3, backgroundColor: C.olive },
    progressLabel: { textAlign: 'center', color: C.mutedDark, fontSize: 13, fontWeight: '500' },

    studyArea: {
      paddingHorizontal: 16,
      paddingBottom: Math.max(BottomTabInset, 96) + 20,
      paddingTop: 4,
      gap: 14,
    },
    cardContainer: { borderRadius: 22, overflow: 'hidden' },
    cardFace: {
      height: '100%', borderRadius: 22, borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center', padding: 24,
    },
    cardFaceLight: { backgroundColor: C.cardLight,  borderColor: C.borderGold },
    cardFaceDark:  { backgroundColor: C.cardDark,   borderColor: C.borderGoldBright },

    faceContainer: { alignItems: 'center', gap: 10, width: '100%' },
    englishMain: { color: C.textDark, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 34 },
    situationText: { color: C.mutedDark, fontSize: 14, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
    backEnglish:   { color: C.mutedLight, fontSize: 13, textAlign: 'center', marginBottom: 4 },
    arabicMain:    { color: C.textLight, fontSize: 32, fontWeight: '700', textAlign: 'center', writingDirection: 'rtl', lineHeight: 50 },
    translitText:  { color: C.mutedLight, fontSize: 14, fontStyle: 'italic', textAlign: 'center' },

    showAnswerBtn:  { backgroundColor: C.blackGlass, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    showAnswerText: { color: C.textLight, fontWeight: '700', fontSize: 16 },

    ratingRow: { flexDirection: 'row', gap: 10 },
    ratingBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 2 },
    ratingBtnSub:   { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
    ratingBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },

    centeredCard: { alignItems: 'center', gap: 14, paddingHorizontal: 32, maxWidth: 340 },
    bigEmoji:  { fontSize: 64, textAlign: 'center' },
    emptyTitle:{ color: C.textDark, fontSize: 22, fontWeight: '700', textAlign: 'center' },
    emptySub:  { color: C.mutedDark, fontSize: 14, textAlign: 'center', lineHeight: 20 },

    completionCard: {
      backgroundColor: C.cardDark,
      borderRadius: 22, borderWidth: 1.5, borderColor: C.borderGoldBright,
      padding: 28, marginHorizontal: 20, alignItems: 'center', gap: 10,
    },
    completionArabic:{ color: C.gold, fontSize: 36, fontWeight: '800', textAlign: 'center' },
    completionTitle: { color: C.textLight, fontSize: 22, fontWeight: '700', textAlign: 'center' },
    completionSub:   { color: C.mutedLight, fontSize: 15, textAlign: 'center' },
    completionHint:  { color: C.gold, fontSize: 13, textAlign: 'center', marginBottom: 4 },

    actionBtnPrimary: {
      backgroundColor: C.blackGlass,
      paddingHorizontal: Spacing.five, paddingVertical: Spacing.three,
      borderRadius: 12, minWidth: 140, alignItems: 'center',
    },
    actionBtnSecondary: {
      backgroundColor: C.cardLight,
      borderWidth: 1.5, borderColor: C.borderGold,
      paddingHorizontal: Spacing.five, paddingVertical: Spacing.three,
      borderRadius: 12, minWidth: 140, alignItems: 'center',
    },
    actionBtnText: { color: C.textLight, fontWeight: '700', fontSize: 15 },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    modalSheet: {
      backgroundColor: C.cardLight,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      maxHeight: '88%',
    },
    modalBody: { padding: 24, paddingBottom: 32 },
    modalTitle: { color: C.textDark, fontSize: 18, fontWeight: '800', marginBottom: 6 },
    modalSub:   { color: C.mutedDark, fontSize: 13, marginBottom: 14, lineHeight: 19 },
    jsonInput: {
      minHeight: 200,
      backgroundColor: C.scrollBg,
      borderRadius: 10, borderWidth: 1.5, borderColor: C.borderGold,
      padding: 14, fontSize: 13, color: C.textDark,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      textAlignVertical: 'top', marginBottom: 8,
    },
    jsonInputError: { borderColor: AGAIN_COLOR },
    importError:    { color: AGAIN_COLOR, fontSize: 13, marginTop: 6 },
    importSuccess:  { color: GOOD_COLOR,  fontSize: 13, marginTop: 6 },
    modalActions:   { flexDirection: 'row', gap: 12, marginTop: 14 },

    backBtn:     { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    backBtnText: { color: C.mutedDark, fontSize: 13, fontWeight: '600' },

    clearBtn:     { backgroundColor: 'rgba(192,57,43,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(192,57,43,0.35)' },
    clearBtnText: { color: AGAIN_COLOR, fontWeight: '700', fontSize: 12 },

    confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    confirmSheet:   { backgroundColor: C.cardLight, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, gap: 12 },
    confirmTitle:   { color: C.textDark, fontSize: 18, fontWeight: '800' },
    confirmSub:     { color: C.mutedDark, fontSize: 14, lineHeight: 20 },
    confirmActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  });
}
