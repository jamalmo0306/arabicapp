import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ModalSheet } from '@/components/ui/modal-sheet';
import { Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import { ROADMAP } from '@/data/roadmap';
import { useTheme } from '@/hooks/use-theme';

export default function RoadmapModal() {
  const colors = useTheme();
  const { settings } = useAppContext();
  const currentWeek = settings.current_week;

  return (
    <ModalSheet title="12-Week Roadmap" onClose={() => router.back()}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        <ThemedText type="small" themeColor="textSecondary">
          Your 12-week Palestinian Arabic learning plan. Read-only — use it as orientation.
        </ThemedText>

        {ROADMAP.map(week => {
          const isCurrent = week.week === currentWeek;
          const isPast = week.week < currentWeek;

          return (
            <ThemedView
              key={week.week}
              type={isCurrent ? 'backgroundSelected' : 'surface'}
              style={[
                styles.weekCard,
                {
                  borderColor: isCurrent ? colors.primary : colors.divider,
                  borderWidth: isCurrent ? 2 : 1,
                  opacity: isPast ? 0.65 : 1,
                },
              ]}>
              {/* Header */}
              <View style={styles.weekHeader}>
                <View
                  style={[
                    styles.weekBadge,
                    { backgroundColor: isCurrent ? colors.primary : colors.backgroundElement },
                  ]}>
                  <ThemedText
                    style={[
                      styles.weekNum,
                      { color: isCurrent ? colors.onPrimary : colors.textSecondary },
                    ]}>
                    Week {week.week}
                  </ThemedText>
                </View>
                {isCurrent && (
                  <View style={[styles.currentTag, { backgroundColor: colors.accent }]}>
                    <ThemedText style={styles.currentTagText}>YOU ARE HERE</ThemedText>
                  </View>
                )}
              </View>

              <ThemedText style={[styles.weekTitle, { color: isCurrent ? colors.primary : colors.text }]}>
                {week.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {week.focus}
              </ThemedText>

              {/* Goals */}
              <View style={styles.goals}>
                {week.goals.map((goal, i) => (
                  <View key={i} style={styles.goalRow}>
                    <ThemedText style={[styles.bullet, { color: colors.primary }]}>•</ThemedText>
                    <ThemedText type="small" style={styles.goalText}>
                      {goal}
                    </ThemedText>
                  </View>
                ))}
              </View>

              {/* Milestone */}
              <View style={[styles.milestone, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
                <ThemedText type="smallBold" style={{ color: colors.accent }}>
                  🏁 Milestone
                </ThemedText>
                <ThemedText type="small" style={styles.milestoneText}>
                  {week.milestone}
                </ThemedText>
              </View>
            </ThemedView>
          );
        })}
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  weekCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  weekBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
  },
  weekNum: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentTag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
  },
  currentTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  goals: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  goalRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
  },
  goalText: {
    flex: 1,
    lineHeight: 20,
  },
  milestone: {
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    padding: Spacing.two,
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  milestoneText: {
    fontStyle: 'italic',
  },
});
