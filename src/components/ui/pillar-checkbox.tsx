import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface PillarCheckboxProps {
  emoji: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export function PillarCheckbox({ emoji, label, checked, onToggle }: PillarCheckboxProps) {
  const colors = useTheme();

  return (
    <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View
        style={[
          styles.row,
          {
            backgroundColor: checked ? colors.primary : colors.surface,
            borderColor: checked ? colors.primary : colors.divider,
          },
        ]}>
        <ThemedText style={styles.emoji}>{emoji}</ThemedText>
        <ThemedText
          style={[styles.label, { color: checked ? colors.onPrimary : colors.text }]}>
          {label}
        </ThemedText>
        <View
          style={[
            styles.check,
            {
              borderColor: checked ? colors.onPrimary : colors.divider,
              backgroundColor: checked ? colors.onPrimary : 'transparent',
            },
          ]}>
          {checked && (
            <ThemedText style={[styles.checkmark, { color: colors.primary }]}>✓</ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
});
