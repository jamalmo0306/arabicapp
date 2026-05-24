import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface XpBadgeProps {
  xp: number;
  size?: 'sm' | 'lg';
}

export function XpBadge({ xp, size = 'sm' }: XpBadgeProps) {
  const colors = useTheme();
  const isLg = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.accent, paddingHorizontal: isLg ? Spacing.three : Spacing.two },
      ]}>
      <ThemedText
        style={[
          styles.text,
          { color: '#FFFFFF', fontSize: isLg ? 18 : 13 },
        ]}>
        ⚡ {xp.toLocaleString()} XP
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingVertical: Spacing.one,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
});
