import { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BarChart } from '@/components/ui/bar-chart';
import { PillarCheckbox } from '@/components/ui/pillar-checkbox';
import { Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { PillarKey } from '@/context/types';
import { getRecentSessions } from '@/lib/db';
import { PILLARS, toDateString } from '@/lib/xp';
import { useTheme } from '@/hooks/use-theme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekBarData(sessions: { date: string; minutes: number }[]) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const minutes = sessions
      .filter(s => s.date === dateStr)
      .reduce((sum, s) => sum + s.minutes, 0);
    return { label, value: minutes };
  });
}

export default function LogScreen() {
  const colors = useTheme();
  const { logSession, isDbReady } = useAppContext();

  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPillars, setSelectedPillars] = useState<Set<PillarKey>>(new Set());
  const [isTutor, setIsTutor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [barData, setBarData] = useState(DAY_LABELS.map(l => ({ label: l, value: 0 })));

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
        notes: notes.trim() || undefined,
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

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.cream }]}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          <ThemedText type="subtitle" style={[styles.screenTitle, { color: colors.primary }]}>
            Log Session
          </ThemedText>

          {/* Weekly bar chart */}
          <ThemedView type="surface" style={[styles.card, { borderColor: colors.divider }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              THIS WEEK (MINUTES)
            </ThemedText>
            <BarChart data={barData} />
          </ThemedView>

          {/* Session form */}
          <ThemedView type="surface" style={[styles.card, { borderColor: colors.divider }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              LOG A SESSION
            </ThemedText>

            {/* Minutes */}
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>Minutes studied</ThemedText>
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                placeholder="e.g. 30"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  {
                    borderColor: colors.divider,
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                  },
                ]}
              />
            </View>

            {/* Pillars */}
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>Pillars completed</ThemedText>
              <View style={styles.pillars}>
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

            {/* Tutor toggle */}
            <Pressable
              onPress={() => setIsTutor(v => !v)}
              style={[
                styles.tutorToggle,
                {
                  backgroundColor: isTutor ? colors.primary : colors.surface,
                  borderColor: isTutor ? colors.primary : colors.divider,
                },
              ]}>
              <ThemedText
                style={{ color: isTutor ? colors.onPrimary : colors.text, fontWeight: '600' }}>
                🎙️ Tutor session {isTutor ? '✓' : ''}
              </ThemedText>
            </Pressable>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>Notes (optional)</ThemedText>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="What did you practice?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    borderColor: colors.divider,
                    color: colors.text,
                    backgroundColor: colors.backgroundElement,
                  },
                ]}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={saving || selectedPillars.size === 0}
              style={({ pressed }) => [
                styles.submitBtn,
                {
                  backgroundColor:
                    selectedPillars.size === 0
                      ? colors.divider
                      : pressed
                      ? colors.primary + 'CC'
                      : colors.primary,
                },
              ]}>
              <ThemedText style={styles.submitBtnText}>
                {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Log Session'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    fontSize: 11,
  },
  fieldGroup: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  pillars: {
    gap: Spacing.two,
  },
  tutorToggle: {
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  submitBtn: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
