import { router } from 'expo-router';
import { useState } from 'react';
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
import type { UserSettings } from '@/context/types';

// ── Colors (mirrors HomeScreen palette) ───────────────────────────────────────
const C = {
  bg:          '#15150F',
  scrollBg:    '#CBB77C',
  blackGlass:  'rgba(14, 15, 15, 0.88)',
  borderGold:  'rgba(255, 213, 121, 0.13)',
  gold:        '#F7C653',
  goldSoft:    'rgba(247, 198, 83, 0.18)',
  olive:       '#9BC76D',
  oliveDim:    'rgba(118, 147, 70, 0.28)',
  mutedLight:  '#CFC4AE',
  textLight:   '#F7E8C0',
  white:       '#FFFFFF',
  inputBg:     'rgba(255, 255, 255, 0.06)',
  inputBorder: 'rgba(255, 213, 121, 0.28)',
  divider:     'rgba(255, 213, 121, 0.10)',
  btnInactive: 'rgba(255, 255, 255, 0.07)',
  btnBorder:   'rgba(255, 213, 121, 0.20)',
};

const WEEK_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const DARK_MODE_OPTIONS: { value: UserSettings['dark_mode']; icon: string; label: string }[] = [
  { value: 'system', icon: '⚙️', label: 'System' },
  { value: 'light',  icon: '☀️', label: 'Light'  },
  { value: 'dark',   icon: '🌙', label: 'Dark'   },
];

export default function SettingsScreen() {
  const { settings, patchSettings } = useAppContext();
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.api_key);
  const [apiSaved,    setApiSaved]    = useState(false);

  const [resourceTitle,    setResourceTitle]    = useState(settings.resource_title);
  const [resourceSubtitle, setResourceSubtitle] = useState(settings.resource_subtitle);
  const [resourceUrl,      setResourceUrl]      = useState(settings.resource_url);
  const [resourceSaved,    setResourceSaved]    = useState(false);

  async function saveResource() {
    await patchSettings({
      resource_title:    resourceTitle.trim()    || 'This Week',
      resource_subtitle: resourceSubtitle.trim() || '',
      resource_url:      resourceUrl.trim(),
    });
    setResourceSaved(true);
    setTimeout(() => setResourceSaved(false), 2000);
  }

  async function setDarkMode(mode: UserSettings['dark_mode']) {
    await patchSettings({ dark_mode: mode });
  }

  async function setCurrentWeek(week: number) {
    await patchSettings({ current_week: week });
  }

  async function saveApiKey() {
    await patchSettings({ api_key: apiKeyDraft.trim() });
    setApiSaved(true);
    setTimeout(() => setApiSaved(false), 2000);
  }

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
              <Text style={s.logoIcon}>⚙️</Text>
              <Text style={s.title}>Settings</Text>
            </View>
          </View>

          {/* ── APPEARANCE ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>APPEARANCE</Text>
            <View style={s.row}>
              {DARK_MODE_OPTIONS.map(({ value, icon, label }) => {
                const active = settings.dark_mode === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setDarkMode(value)}
                    style={[s.modeBtn, active && s.modeBtnActive]}
                  >
                    <Text style={s.modeIcon}>{icon}</Text>
                    <Text style={[s.modeLabel, active && s.modeLabelActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── CURRENT WEEK ── */}
          <View style={s.card}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionLabel}>12-WEEK PROGRAM</Text>
              <View style={s.weekPill}>
                <Text style={s.weekPillText}>Week {settings.current_week} of 12</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={s.weekProgressTrack}>
              <View style={[s.weekProgressFill, { width: `${(settings.current_week / 12) * 100}%` }]} />
            </View>

            {/* Week grid */}
            <View style={s.weekGrid}>
              {WEEK_OPTIONS.map(w => {
                const active = settings.current_week === w;
                const past   = w < settings.current_week;
                return (
                  <Pressable
                    key={w}
                    onPress={() => setCurrentWeek(w)}
                    style={[s.weekBtn, active && s.weekBtnActive, past && s.weekBtnPast]}
                  >
                    <Text style={[s.weekBtnText, active && s.weekBtnTextActive]}>
                      {w}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── API KEY ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>ANTHROPIC API KEY</Text>

            <View style={s.apiRow}>
              <TextInput
                value={apiKeyDraft}
                onChangeText={setApiKeyDraft}
                onBlur={saveApiKey}
                placeholder="sk-ant-…"
                placeholderTextColor="rgba(207,196,174,0.5)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={s.apiInput}
              />
              <Pressable onPress={saveApiKey} style={s.apiSaveBtn}>
                <Text style={s.apiSaveBtnText}>
                  {apiSaved ? '✓' : 'Save'}
                </Text>
              </Pressable>
            </View>

            <Text style={s.helpText}>
              🔑  Get a free key at{' '}
              <Text style={s.helpLink}>console.anthropic.com</Text>
              {' '}— needed for flashcards &amp; AI coach.
            </Text>
          </View>

          {/* ── WEEKLY RESOURCE ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>WEEKLY RESOURCE</Text>

            <TextInput
              value={resourceTitle}
              onChangeText={setResourceTitle}
              placeholder="Title"
              placeholderTextColor="rgba(207,196,174,0.5)"
              autoCorrect={false}
              style={s.apiInput}
            />
            <TextInput
              value={resourceSubtitle}
              onChangeText={setResourceSubtitle}
              placeholder="Subtitle"
              placeholderTextColor="rgba(207,196,174,0.5)"
              autoCorrect={false}
              style={s.apiInput}
            />
            <TextInput
              value={resourceUrl}
              onChangeText={setResourceUrl}
              placeholder="https://…"
              placeholderTextColor="rgba(207,196,174,0.5)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={s.apiInput}
            />

            <Pressable onPress={saveResource} style={s.apiSaveBtn}>
              <Text style={s.apiSaveBtnText}>
                {resourceSaved ? '✓ Saved' : 'Save Resource'}
              </Text>
            </Pressable>
          </View>

          {/* ── TOOLS ── */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>TOOLS</Text>

            <Pressable
              onPress={() => router.push('/(modal)/checkin')}
              style={s.primaryBtn}
            >
              <Text style={s.primaryBtnText}>📋  Weekly Check-In</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(modal)/roadmap')}
              style={s.outlineBtn}
            >
              <Text style={s.outlineBtnText}>🗺️  View 12-Week Roadmap</Text>
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
    gap: 14,
  },

  // ─ Header ─
  header:   { marginBottom: 6 },
  logoRow:  { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { fontSize: 32, marginRight: 12 },
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
    gap: 14,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: C.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // ─ Appearance ─
  row: { flexDirection: 'row', gap: 10 },

  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.btnBorder,
    backgroundColor: C.btnInactive,
    alignItems: 'center',
    gap: 4,
  },
  modeBtnActive: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  modeIcon:  { fontSize: 22 },
  modeLabel: {
    color: C.mutedLight,
    fontSize: 12,
    fontWeight: '600',
  },
  modeLabelActive: {
    color: '#2C251C',
    fontWeight: '800',
  },

  // ─ Week picker ─
  weekPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: C.oliveDim,
    borderWidth: 1,
    borderColor: C.olive,
  },
  weekPillText: {
    color: C.olive,
    fontSize: 11,
    fontWeight: '700',
  },
  weekProgressTrack: {
    height: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  weekProgressFill: {
    height: '100%',
    backgroundColor: C.olive,
    borderRadius: 10,
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.btnBorder,
    backgroundColor: C.btnInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBtnActive: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  weekBtnPast: {
    backgroundColor: C.oliveDim,
    borderColor: 'rgba(118,147,70,0.35)',
  },
  weekBtnText: {
    color: C.mutedLight,
    fontSize: 14,
    fontWeight: '700',
  },
  weekBtnTextActive: {
    color: '#2C251C',
    fontWeight: '800',
  },

  // ─ API key ─
  apiRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  apiInput: {
    flex: 1,
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.white,
  },
  apiSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.goldSoft,
    borderWidth: 1.5,
    borderColor: C.gold,
    minWidth: 54,
    alignItems: 'center',
  },
  apiSaveBtnText: {
    color: '#2C251C',
    fontSize: 13,
    fontWeight: '800',
  },
  helpText: {
    color: C.mutedLight,
    fontSize: 12,
    lineHeight: 18,
  },
  helpLink: {
    color: C.gold,
    fontWeight: '600',
  },

  // ─ Tool buttons ─
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: C.olive,
  },
  primaryBtnText: {
    color: '#15150F',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  outlineBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: C.btnInactive,
    borderWidth: 1.5,
    borderColor: C.inputBorder,
  },
  outlineBtnText: {
    color: C.textLight,
    fontWeight: '700',
    fontSize: 15,
  },
});
