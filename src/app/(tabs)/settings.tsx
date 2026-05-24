import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { UserSettings } from '@/context/types';
import { useTheme } from '@/hooks/use-theme';

const WEEK_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function SettingsScreen() {
  const colors = useTheme();
  const { settings, patchSettings } = useAppContext();
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.api_key);

  async function setDarkMode(mode: UserSettings['dark_mode']) {
    await patchSettings({ dark_mode: mode });
  }

  async function setCurrentWeek(week: number) {
    await patchSettings({ current_week: week });
  }

  async function saveApiKey() {
    await patchSettings({ api_key: apiKeyDraft.trim() });
  }

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.cream }]}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          <ThemedText type="subtitle" style={[styles.screenTitle, { color: colors.primary }]}>
            Settings
          </ThemedText>

          {/* Appearance */}
          <ThemedView type="surface" style={[styles.card, { borderColor: colors.divider }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              APPEARANCE
            </ThemedText>
            <View style={styles.row}>
              {(['system', 'light', 'dark'] as const).map(mode => (
                <Pressable
                  key={mode}
                  onPress={() => setDarkMode(mode)}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor:
                        settings.dark_mode === mode ? colors.primary : colors.backgroundElement,
                      borderColor:
                        settings.dark_mode === mode ? colors.primary : colors.divider,
                    },
                  ]}>
                  <ThemedText
                    style={{
                      color: settings.dark_mode === mode ? colors.onPrimary : colors.text,
                      fontWeight: '600',
                      fontSize: 13,
                      textTransform: 'capitalize',
                    }}>
                    {mode === 'system' ? '⚙️ System' : mode === 'light' ? '☀️ Light' : '🌙 Dark'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </ThemedView>

          {/* Current week */}
          <ThemedView type="surface" style={[styles.card, { borderColor: colors.divider }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              12-WEEK PROGRAM — CURRENT WEEK
            </ThemedText>
            <View style={styles.weekGrid}>
              {WEEK_OPTIONS.map(w => (
                <Pressable
                  key={w}
                  onPress={() => setCurrentWeek(w)}
                  style={[
                    styles.weekBtn,
                    {
                      backgroundColor:
                        settings.current_week === w ? colors.primary : colors.backgroundElement,
                      borderColor:
                        settings.current_week === w ? colors.primary : colors.divider,
                    },
                  ]}>
                  <ThemedText
                    style={{
                      color:
                        settings.current_week === w ? colors.onPrimary : colors.text,
                      fontWeight: '600',
                      fontSize: 14,
                    }}>
                    {w}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </ThemedView>

          {/* API Key */}
          <ThemedView type="surface" style={[styles.card, { borderColor: colors.divider }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              ANTHROPIC API KEY
            </ThemedText>
            <TextInput
              value={apiKeyDraft}
              onChangeText={setApiKeyDraft}
              onBlur={saveApiKey}
              placeholder="sk-ant-…"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.apiInput,
                {
                  borderColor: colors.divider,
                  color: colors.text,
                  backgroundColor: colors.backgroundElement,
                },
              ]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              Get a free key at console.anthropic.com — needed for flashcards and AI features.
            </ThemedText>
          </ThemedView>

          {/* Actions */}
          <ThemedView type="surface" style={[styles.card, { borderColor: colors.divider }]}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              TOOLS
            </ThemedText>

            <Pressable
              onPress={() => router.push('/(modal)/checkin')}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.actionBtnText}>📋 Weekly Check-In</ThemedText>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(modal)/roadmap')}
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1.5 }]}>
              <ThemedText style={[styles.actionBtnText, { color: colors.primary }]}>
                🗺️ View 12-Week Roadmap
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
  screenTitle: { fontSize: 24, fontWeight: '700' },
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
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  weekBtn: {
    width: 44,
    height: 44,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  apiInput: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
});
