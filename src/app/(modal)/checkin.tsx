import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { CheckInAnswers } from '@/context/types';
import { generateCheckInResponse } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

export default function CheckInModal() {
  const colors = useTheme();
  const { saveCheckIn, settings } = useAppContext();

  const [minutes, setMinutes] = useState('');
  const [pillars, setPillars] = useState('');
  const [ankiCount, setAnkiCount] = useState('');
  const [newSentence, setNewSentence] = useState('');
  const [boringThing, setBoringThing] = useState('');
  const [tutorHappened, setTutorHappened] = useState(false);

  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!minutes) return;
    setLoading(true);
    try {
      const answers: CheckInAnswers = {
        minutes: parseInt(minutes, 10) || 0,
        pillars: pillars.trim(),
        anki_count: parseInt(ankiCount, 10) || 0,
        new_sentence: newSentence.trim(),
        boring_thing: boringThing.trim(),
        tutor_happened: tutorHappened,
      };
      const response = await generateCheckInResponse(answers, settings.api_key);
      await saveCheckIn(answers, response);
      setAiResponse(response);
      setDone(true);
    } catch (e) {
      setAiResponse('Could not reach the AI coach right now. Your check-in has been saved.');
      await saveCheckIn(
        {
          minutes: parseInt(minutes, 10) || 0,
          pillars: pillars.trim(),
          anki_count: parseInt(ankiCount, 10) || 0,
          new_sentence: newSentence.trim(),
          boring_thing: boringThing.trim(),
          tutor_happened: tutorHappened,
        },
        ''
      );
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalSheet title="Weekly Check-In" onClose={() => router.back()}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {done ? (
          <View style={styles.responseContainer}>
            <ThemedText style={styles.successEmoji}>🌿</ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.primary }}>
              Check-in complete!
            </ThemedText>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.coachLabel}>
              YOUR COACH SAYS:
            </ThemedText>
            <ThemedView
              type="surface"
              style={[styles.responseCard, { borderColor: colors.accent }]}>
              <ThemedText style={styles.responseText}>{aiResponse}</ThemedText>
            </ThemedView>
            <ThemedText type="small" style={{ color: colors.accent }}>
              +20 XP earned
            </ThemedText>
            <Pressable
              onPress={() => router.back()}
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.doneBtnText}>Done</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Six quick questions — your AI coach will respond.
            </ThemedText>

            <Field
              label="How many minutes did you study this week?"
              placeholder="e.g. 150"
              value={minutes}
              onChange={setMinutes}
              keyboardType="number-pad"
              colors={colors}
            />

            <Field
              label="Which pillars did you complete? (e.g. flashcards, speaking)"
              placeholder="flashcards, listening, structured…"
              value={pillars}
              onChange={setPillars}
              colors={colors}
            />

            <Field
              label="How many Anki cards did you review?"
              placeholder="e.g. 80"
              value={ankiCount}
              onChange={setAnkiCount}
              keyboardType="number-pad"
              colors={colors}
            />

            <Field
              label="One new sentence you can say in Arabic now:"
              placeholder="e.g. يلا نروح — Let's go"
              value={newSentence}
              onChange={setNewSentence}
              colors={colors}
            />

            <Field
              label="What felt boring or difficult this week?"
              placeholder="e.g. grammar drills, vocabulary lists…"
              value={boringThing}
              onChange={setBoringThing}
              colors={colors}
            />

            <View style={styles.switchRow}>
              <ThemedText style={styles.switchLabel}>
                Did your tutor session happen?
              </ThemedText>
              <Switch
                value={tutorHappened}
                onValueChange={setTutorHappened}
                trackColor={{ false: colors.divider, true: colors.primary }}
                thumbColor={colors.onPrimary}
              />
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={loading || !minutes}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: !minutes ? colors.divider : colors.primary,
                },
              ]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitBtnText}>
                  Submit & get feedback
                </ThemedText>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </ModalSheet>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  keyboardType = 'default',
  colors,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.fieldGroup}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
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
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  fieldGroup: { gap: Spacing.one },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  input: {
    borderWidth: 1.5,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  switchLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  submitBtn: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  responseContainer: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  successEmoji: { fontSize: 64 },
  coachLabel: { letterSpacing: 0.8, fontSize: 11, alignSelf: 'flex-start' },
  responseCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1.5,
    alignSelf: 'stretch',
  },
  responseText: { fontSize: 16, lineHeight: 24 },
  doneBtn: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
