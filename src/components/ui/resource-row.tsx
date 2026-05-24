import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ResourceItem } from '@/context/types';
import { useTheme } from '@/hooks/use-theme';

const TYPE_EMOJI: Record<ResourceItem['type'], string> = {
  app: '📱',
  youtube: '▶️',
  podcast: '🎙️',
  book: '📚',
  website: '🌐',
};

const LEVEL_COLORS: Record<ResourceItem['level'], string> = {
  beginner: '#4A9E5C',
  intermediate: '#C9952A',
  advanced: '#C0392B',
  all: '#6B8A53',
};

interface ResourceRowProps {
  item: ResourceItem;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

export function ResourceRow({ item, isFavorite, onPress, onToggleFavorite }: ResourceRowProps) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surface : colors.backgroundElement },
      ]}>
      <View style={styles.leftCol}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.emoji}>{TYPE_EMOJI[item.type]}</ThemedText>
          <ThemedText style={styles.title} numberOfLines={1}>
            {item.title}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {item.description}
        </ThemedText>
        <View style={styles.badges}>
          <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[item.level] }]}>
            <ThemedText style={styles.levelText}>{item.level}</ThemedText>
          </View>
          {item.isFree && (
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.levelText}>free</ThemedText>
            </View>
          )}
        </View>
      </View>
      <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.favBtn}>
        <ThemedText style={styles.favIcon}>{isFavorite ? '❤️' : '🤍'}</ThemedText>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    borderRadius: Spacing.two,
  },
  leftCol: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  emoji: {
    fontSize: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  levelBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
  },
  levelText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  favBtn: {
    padding: Spacing.one,
  },
  favIcon: {
    fontSize: 20,
  },
});
