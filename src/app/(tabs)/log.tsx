import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { useAppContext } from '@/context/app-context';
import type { AppColors } from '@/lib/theme';
import type { ActivityLog, PillarKey } from '@/context/types';
import { getAllActivityLog } from '@/lib/db';

// ── Activity types ────────────────────────────────────────────────────────────
const ACTIVITY_TYPES: { label: string; emoji: string; pillars: PillarKey[]; isTutor: boolean }[] = [
  { label: 'Flashcards',       emoji: '🃏', pillars: ['flashcards'], isTutor: false },
  { label: 'Structured Study', emoji: '📖', pillars: ['structured'], isTutor: false },
  { label: 'Speaking Practice',emoji: '🗣️', pillars: ['speaking'],   isTutor: false },
  { label: 'Listening',        emoji: '🎧', pillars: ['listening'],  isTutor: false },
  { label: 'Tutor Session',    emoji: '🎙️', pillars: ['speaking'],   isTutor: true  },
];

// ── Time ranges ───────────────────────────────────────────────────────────────
type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';
const TIME_RANGES: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y'];

function getDateRange(range: TimeRange): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  if (range === '1W')  start.setDate(end.getDate() - 6);
  if (range === '1M')  start.setDate(end.getDate() - 29);
  if (range === '3M')  start.setDate(end.getDate() - 89);
  if (range === '6M')  start.setDate(end.getDate() - 179);
  if (range === '1Y')  start.setDate(end.getDate() - 364);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

interface ChartPoint { label: string; value: number }

function buildChartData(logs: ActivityLog[], range: TimeRange): ChartPoint[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const sumMins = (filtered: ActivityLog[]) =>
    filtered.reduce((acc, l) => acc + (l.minutes ?? 0), 0);

  if (range === '1W') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - 6 + i);
      const ds = d.toISOString().slice(0, 10);
      return { label: d.toLocaleDateString('en', { weekday: 'short' }), value: sumMins(logs.filter(l => l.date === ds)) };
    });
  }
  if (range === '1M') {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - 29 + i);
      const ds = d.toISOString().slice(0, 10);
      const label = i === 0 || i === 29 || i % 7 === 0
        ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '';
      return { label, value: sumMins(logs.filter(l => l.date === ds)) };
    });
  }
  if (range === '3M') {
    return Array.from({ length: 13 }, (_, i) => {
      const ws = new Date(today); ws.setDate(today.getDate() - 90 + i * 7);
      const we = new Date(ws); we.setDate(ws.getDate() + 7);
      const s = ws.toISOString().slice(0, 10), e = we.toISOString().slice(0, 10);
      return { label: i % 3 === 0 ? ws.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '', value: sumMins(logs.filter(l => l.date >= s && l.date < e)) };
    });
  }
  if (range === '6M') {
    return Array.from({ length: 26 }, (_, i) => {
      const ws = new Date(today); ws.setDate(today.getDate() - 180 + i * 7);
      const we = new Date(ws); we.setDate(ws.getDate() + 7);
      const s = ws.toISOString().slice(0, 10), e = we.toISOString().slice(0, 10);
      return { label: i % 4 === 0 ? ws.toLocaleDateString('en', { month: 'short' }) : '', value: sumMins(logs.filter(l => l.date >= s && l.date < e)) };
    });
  }
  return Array.from({ length: 12 }, (_, i) => {
    const month = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    const next  = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const s = month.toISOString().slice(0, 10), e = next.toISOString().slice(0, 10);
    return { label: month.toLocaleDateString('en', { month: 'short' }), value: sumMins(logs.filter(l => l.date >= s && l.date < e)) };
  });
}

// ── Line Chart (pure View, no SVG dep) ────────────────────────────────────────
function LineChart({ data, width, C }: { data: ChartPoint[]; width: number; C: AppColors }) {
  const HEIGHT = 110;
  const PAD = { t: 14, b: 28, l: 36, r: 6 };
  const cW = width - PAD.l - PAD.r;
  const cH = HEIGHT - PAD.t - PAD.b;
  const max = Math.max(...data.map(d => d.value), 1);
  const n = data.length;

  const pts = data.map((d, i) => ({
    x: PAD.l + (n > 1 ? (i / (n - 1)) * cW : cW / 2),
    y: PAD.t + cH - (d.value / max) * cH,
    v: d.value,
  }));

  return (
    <View style={{ width, height: HEIGHT }}>
      {[0, 0.5, 1].map(frac => (
        <View key={frac}>
          <View style={{
            position: 'absolute',
            left: PAD.l, right: PAD.r,
            top: PAD.t + cH * (1 - frac) - 0.5,
            height: 1,
            backgroundColor: 'rgba(255,213,121,0.08)',
          }} />
          <Text style={{
            position: 'absolute',
            left: 0,
            top: PAD.t + cH * (1 - frac) - 7,
            width: PAD.l - 4,
            textAlign: 'right',
            fontSize: 9,
            color: C.mutedDark,
          }}>{Math.round(max * frac)}m</Text>
        </View>
      ))}

      {pts.slice(0, -1).map((p1, i) => {
        const p2 = pts[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: 'absolute',
            left: (p1.x + p2.x) / 2 - len / 2,
            top: (p1.y + p2.y) / 2 - 1.5,
            width: len, height: 3,
            backgroundColor: C.olive,
            borderRadius: 2,
            transform: [{ rotate: `${angle}deg` }],
          }} />
        );
      })}

      {pts.map((p, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: p.x - 5, top: p.y - 5,
          width: 10, height: 10, borderRadius: 5,
          backgroundColor: p.v > 0 ? C.olive : 'transparent',
          borderWidth: p.v > 0 ? 0 : 1.5,
          borderColor: 'rgba(155,199,109,0.35)',
        }} />
      ))}

      {data.map((d, i) => d.label ? (
        <Text key={i} style={{
          position: 'absolute',
          left: pts[i].x - 24,
          top: HEIGHT - PAD.b + 6,
          width: 48,
          textAlign: 'center',
          fontSize: 10,
          color: C.mutedDark,
        }}>{d.label}</Text>
      ) : null)}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function LogScreen() {
  const { logSession, isDbReady, settings, colors, deleteLog } = useAppContext();
  const C = colors;
  const s = useMemo(() => makeStyles(C), [C]);

  const [allLogs, setAllLogs]           = useState<ActivityLog[]>([]);
  const [range, setRange]               = useState<TimeRange>('1W');
  const [chartWidth, setChartWidth]     = useState(300);
  const [chartData, setChartData]       = useState<ChartPoint[]>([]);

  const [activityType, setActivityType] = useState<string | null>(null);
  const [minutes, setMinutes]           = useState('');
  const [notes, setNotes]               = useState('');
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  useEffect(() => {
    if (isDbReady) loadLogs();
  }, [isDbReady]);

  useEffect(() => {
    setChartData(buildChartData(allLogs, range));
  }, [allLogs, range]);

  async function loadLogs() {
    const logs = await getAllActivityLog();
    setAllLogs(logs);
  }

  async function handleDeleteLog(id: number) {
    await deleteLog(id);
    setAllLogs(prev => prev.filter(l => l.id !== id));
  }

  async function handleSubmit() {
    if (!activityType) return;
    setSaving(true);
    const activity = ACTIVITY_TYPES.find(a => a.label === activityType)!;
    try {
      await logSession({
        minutes: parseInt(minutes, 10) || 0,
        pillars: activity.pillars,
        notes: notes.trim() || undefined,
        isTutorSession: activity.isTutor,
        activityType,
      });
      setSaved(true);
      setMinutes('');
      setNotes('');
      setActivityType(null);
      await loadLogs();
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!activityType && !saving;
  const { start: rangeStart, end: rangeEnd } = getDateRange(range);
  const logsInRange = allLogs.filter(l => l.date >= rangeStart && l.date <= rangeEnd);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={C.statusBar} backgroundColor={C.statusBarBg} />

      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView
          style={s.screen}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HEADER ── */}
          <View style={s.header}>
            <Text style={s.logoIcon}>📊</Text>
            <Text style={s.title}>Activity Log</Text>
          </View>

          {/* ── CHART ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>ACTIVITY OVER TIME</Text>

            <View style={s.rangeRow}>
              {TIME_RANGES.map(r => (
                <Pressable
                  key={r}
                  onPress={() => setRange(r)}
                  style={[s.rangePill, range === r && s.rangePillActive]}
                >
                  <Text style={[s.rangePillText, range === r && s.rangePillTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <View onLayout={e => setChartWidth(e.nativeEvent.layout.width)}>
              <LineChart data={chartData} width={chartWidth} C={C} />
            </View>

            <Text style={s.chartMeta}>
              {logsInRange.length} {logsInRange.length === 1 ? 'activity' : 'activities'} in this period
            </Text>
          </View>

          {/* ── LOG FORM ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>LOG AN ACTIVITY</Text>

            <View style={s.activityGrid}>
              {ACTIVITY_TYPES.map(a => (
                <Pressable
                  key={a.label}
                  onPress={() => setActivityType(prev => prev === a.label ? null : a.label)}
                  style={[s.activityPill, activityType === a.label && s.activityPillActive]}
                >
                  <Text style={s.activityEmoji}>{a.emoji}</Text>
                  <Text style={[s.activityLabel, activityType === a.label && s.activityLabelActive]}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.divider} />

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>⏱ Minutes (optional)</Text>
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                placeholder="e.g. 30"
                placeholderTextColor="rgba(207,196,174,0.5)"
                style={s.input}
              />
            </View>

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

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
            >
              <Text style={s.submitBtnText}>
                {saving ? 'Saving…' : saved ? '✓  Logged!' : 'Log Activity'}
              </Text>
            </Pressable>
          </View>

          {/* ── HISTORY ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>SESSION HISTORY</Text>
            {allLogs.length === 0 ? (
              <Text style={s.emptyText}>No sessions logged yet.</Text>
            ) : (
              allLogs.map(log => {
                const act = ACTIVITY_TYPES.find(a => a.label === log.activity_type);
                return (
                  <View key={log.id} style={s.historyRow}>
                    <Text style={s.historyEmoji}>{act?.emoji ?? '📌'}</Text>
                    <View style={s.historyText}>
                      <Text style={s.historyActivity}>{log.activity_type}</Text>
                      <Text style={s.historyDate}>
                        {new Date(log.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {log.minutes ? `  ·  ${log.minutes} min` : ''}
                      </Text>
                      {!!log.notes && <Text style={s.historyNotes}>{log.notes}</Text>}
                    </View>
                    <Pressable onPress={() => handleDeleteLog(log.id)} hitSlop={10} style={s.deleteBtn}>
                      <Text style={s.deleteBtnText}>✕</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.scrollBg },
    screen: { flex: 1, backgroundColor: C.scrollBg },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 140, gap: 14 },

    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    logoIcon: { fontSize: 34, marginRight: 12 },
    title: { color: C.textDark, fontSize: 28, fontWeight: '800', letterSpacing: 0.1 },

    card: {
      backgroundColor: C.blackGlass,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.borderGold,
      padding: 20,
      gap: 14,
    },
    sectionLabel: { color: C.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },

    rangeRow: { flexDirection: 'row', gap: 8 },
    rangePill: {
      flex: 1, paddingVertical: 7, borderRadius: 20,
      borderWidth: 1, borderColor: 'rgba(255,213,121,0.2)',
      backgroundColor: 'rgba(255,255,255,0.05)',
      alignItems: 'center',
    },
    rangePillActive: { backgroundColor: C.gold, borderColor: C.gold },
    rangePillText: { color: C.mutedLight, fontSize: 12, fontWeight: '700' },
    rangePillTextActive: { color: C.textDark },
    chartMeta: { color: C.mutedLight, fontSize: 12, textAlign: 'center', marginTop: -6 },

    activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    activityPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 10,
      borderRadius: 12, borderWidth: 1.5,
      borderColor: 'rgba(255,213,121,0.2)',
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    activityPillActive: { backgroundColor: C.oliveDim, borderColor: C.olive },
    activityEmoji: { fontSize: 16 },
    activityLabel: { color: C.mutedLight, fontSize: 13, fontWeight: '600' },
    activityLabelActive: { color: C.olive },

    divider: { height: 1, backgroundColor: C.borderGold },
    fieldGroup: { gap: 8 },
    fieldLabel: { color: C.mutedLight, fontSize: 14, fontWeight: '600' },
    input: {
      backgroundColor: C.inputBg,
      borderWidth: 1.5, borderColor: C.inputBorder,
      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
      fontSize: 16, color: C.white,
    },
    textArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },

    submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: C.olive, marginTop: 4 },
    submitBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
    submitBtnText: { color: C.textDark, fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

    emptyText: { color: C.mutedLight, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
    historyRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.borderGold },
    historyEmoji: { fontSize: 22, marginTop: 2 },
    historyText: { flex: 1, gap: 3 },
    historyActivity: { color: C.textLight, fontSize: 14, fontWeight: '700' },
    historyDate: { color: C.mutedLight, fontSize: 12 },
    historyNotes: { color: C.mutedLight, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    deleteBtn:     { paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'center' },
    deleteBtnText: { color: 'rgba(192,57,43,0.65)', fontSize: 16, fontWeight: '700' },
  });
}
