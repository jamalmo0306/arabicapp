import { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { BarChart } from '@/components/ui/bar-chart';
import { PillarCheckbox } from '@/components/ui/pillar-checkbox';
import { useAppContext } from '@/context/app-context';
import type { PillarKey } from '@/context/types';
import { getRecentSessions } from '@/lib/db';
import { PILLARS, toDateString } from '@/lib/xp';

// ── Colors (mirrors HomeScreen palette) ───────────────────────────────────────
const C = {
  bg:          '#15150F',
  scrollBg:    '#CBB77C',
  blackGlass:  'rgba(14, 15, 15, 0.88)',
  borderGold:  'rgba(255, 213, 121, 0.13)',
  gold:        '#F7C653',
  olive:       '#9BC76D',
  oliveDim:    'rgba(118, 147, 70, 0.30)',
  mutedLight:  '#CFC4AE',
  textLight:   '#F7E8C0',
  white:       '#FFFFFF',
  inputBg:     'rgba(255, 255, 255, 0.06)',
  inputBorder: 'rgba(255, 213, 121, 0.28)',
  divider:     'rgba(255, 213, 121, 0.10)',
  danger:      'rgba(255,255,255,0.18)',
};

// ── Helpers (unchanged logic) ──────────────────────────────────────────────────
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekBarData(sessions: { date: string; minutes: number }[]) {
  const today     = new Date();
  const dayOfWeek = today.getDay();
  const monday    = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  return DAY_LABELS.map((label, i) => {
    const d       = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const minutes = sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.minutes, 0);
    return { label, value: minutes };
  });
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function LogScreen() {
  const { logSession, isDbReady } = useAppContext();

  const [minutes,         setMinutes]         = useState('');
  const [notes,           setNotes]           = useState('');
  const [selectedPillars, setSelectedPillars] = useState<Set<PillarKey>>(new Set());
  const [isTutor,         setIsTutor]         = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [barData,         setBarData]         = useState(
    DAY_LABELS.map(l => ({ label: l, value: 0 })),
  );

  useEffect(() => {
    if (isDbReady) loadWeekData();
  }, [isDbReady]);

  async function loadWeekData() {
    const sessions = await getRecentSessions(60);
    setBarData(getWeekBarData(sessions));
  }

  function togglePillar(key: PillarKey) {
    setSelectedPillars(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedPillars.size === 0) return;
    setSaving(true);
    try {
      await logSession({
        minutes: parseInt(minutes, 10) || 0,
        pillars: Array.from(selectedPillars),
        notes:   notes.trim() || undefined,
        isTutorSession: isTutor,
      });
      setSaved(true);
      setMinutes('');
      setNotes('');
      setSelectedPillars(new Set());
      setIsTutor(false);
      await loadWeekData();
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = selectedPillars.size > 0 && !saving;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor={C.scrollBg} />

      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          style={s.screen}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── HEADER ── */}
          <View style={s.header}>
            <View style={s.logoRow}>
              <Text style={s.logoIcon}>📊</Text>
              <Text style={s.title}>Log Session</Text>
            </View>
          </View>

          {/* ── WEEKLY CHART ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>THIS WEEK (MINUTES)</Text>
            <BarChart data={barData} />
          </View>

          {/* ── SESSION FORM ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>LOG A SESSION</Text>

            {/* Minutes */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>⏱ Minutes studied</Text>
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                placeholder="e.g. 30"
                placeholderTextColor="rgba(207,196,174,0.5)"
                style={s.input}
              />
            </View>

            <View style={s.divider} />

            {/* Pillars */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>🏛 Pillars completed</Text>
              <View style={s.pillarsWrap}>
                {PILLARS.map(p => (
                  <PillarCheckbox
                    key={p.key}
                    emoji={p.emoji}
                    label={p.label}
                    checked={selectedPillars.has(p.key)}
                    onToggle={() => togglePillar(p.key)}
                  />
                ))}
              </View>
            </View>

            <View style={s.divider} />

            {/* Tutor toggle */}
            <Pressable
              onPress={() => setIsTutor(v => !v)}
              style={[s.tutorToggle, isTutor && s.tutorToggleActive]}
            >
              <Text style={[s.tutorText, isTutor && s.tutorTextActive]}>
                🎙️  Tutor session{isTutor ? '  ✓' : ''}
              </Text>
            </Pressable>

            <View style={s.divider} />

            {/* Notes */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>📝 Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="What did you practice?"
                placeholderTextColor="rgba(207,196,174,0.5)"
                multiline
                numberOfLines={3}
                style={[s.input, s.textArea]}
              />
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            >
              <Text style={s.submitBtnText}>
                {saving ? 'Saving…' : saved ? '✓  Saved!' : 'Log Session'}
              </Text>
            </Pressable>
          </View>

        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, backgroundColor: C.scrollBg },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 140,
  },

  // ─ Header ─
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { fontSize: 34, marginRight: 12 },
  title: {
    color: '#2C251C',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  // ─ Glass card ─
  card: {
    backgroundColor: C.blackGlass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderGold,
    padding: 20,
    marginBottom: 14,
    gap: 16,
  },

  sectionLabel: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  divider: {
    height: 1,
    backgroundColor: C.divider,
  },

  // ─ Form ─
  fieldGroup: { gap: 10 },

  fieldLabel: {
    color: C.mutedLight,
    fontSize: 14,
    fontWeight: '600',
  },

  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: C.white,
  },

  textArea: {
    height: 88,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  pillarsWrap: { gap: 8 },

  tutorToggle: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: C.inputBg,
  },
  tutorToggleActive: {
    backgroundColor: C.oliveDim,
    borderColor: C.olive,
  },
  tutorText: {
    color: C.mutedLight,
    fontSize: 15,
    fontWeight: '600',
  },
  tutorTextActive: {
    color: C.olive,
    fontWeight: '700',
  },

  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: C.olive,
    marginTop: 4,
  },
  submitBtnDisabled: {
    backgroundColor: C.danger,
  },
  submitBtnText: {
    color: '#15150F',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
