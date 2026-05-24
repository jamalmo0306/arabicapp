import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ModalSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalSheet({ title, onClose, children }: ModalSheetProps) {
  const colors = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={[styles.closeBtn, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText style={styles.closeText}>✕</ThemedText>
          </Pressable>
        </View>
        <View style={styles.content}>{children}</View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontSize: 22,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
