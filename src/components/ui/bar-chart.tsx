import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BarData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarData[];
  maxHeight?: number;
}

const BAR_MAX_HEIGHT = 80;

function Bar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const height = useSharedValue(0);

  useEffect(() => {
    const target = maxValue > 0 ? (value / maxValue) * BAR_MAX_HEIGHT : 0;
    height.value = withTiming(target, { duration: 600 });
  }, [value, maxValue, height]);

  const animStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View
      style={[animStyle, styles.bar, { backgroundColor: value > 0 ? color : 'transparent' }]}
    />
  );
}

export function BarChart({ data }: BarChartProps) {
  const colors = useTheme();
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.container}>
      {data.map((d, i) => (
        <View key={i} style={styles.barWrapper}>
          <View style={[styles.track, { backgroundColor: colors.surface }]}>
            <Bar value={d.value} maxValue={maxValue} color={colors.primary} />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            {d.label}
          </ThemedText>
          {d.value > 0 && (
            <ThemedText type="small" style={[styles.value, { color: colors.primary }]}>
              {d.value}m
            </ThemedText>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    height: BAR_MAX_HEIGHT + 40,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    justifyContent: 'flex-end',
  },
  track: {
    width: '100%',
    height: BAR_MAX_HEIGHT,
    borderRadius: Spacing.one,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: Spacing.one,
  },
  label: {
    fontSize: 11,
  },
  value: {
    fontSize: 11,
    fontWeight: '600',
    position: 'absolute',
    top: -16,
  },
});
