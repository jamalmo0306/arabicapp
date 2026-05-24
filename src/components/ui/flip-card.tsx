import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  onFlip?: (showing: 'front' | 'back') => void;
}

export function FlipCard({ front, back, onFlip }: FlipCardProps) {
  const colors = useTheme();
  const rotation = useSharedValue(0); // 0 = front, 1 = back

  function flip() {
    const toBack = rotation.value < 0.5;
    rotation.value = withTiming(toBack ? 1 : 0, { duration: 200, easing: Easing.out(Easing.quad) });
    onFlip?.(toBack ? 'back' : 'front');
  }

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 1], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      backfaceVisibility: 'hidden',
    };
  });

  return (
    <View style={styles.container} onTouchEnd={flip}>
      <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
        <ThemedView
          type="surface"
          style={[styles.card, { borderColor: colors.divider }]}>
          {front}
        </ThemedView>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
        <ThemedView
          type="surface"
          style={[styles.card, styles.backCard, { borderColor: colors.primary }]}>
          {back}
        </ThemedView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    width: '100%',
  },
  card: {
    flex: 1,
    borderRadius: Spacing.four,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  backCard: {
    borderWidth: 2,
  },
});
