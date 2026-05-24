import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FilterChip } from '@/components/ui/filter-chip';
import { ResourceRow } from '@/components/ui/resource-row';
import { Spacing } from '@/constants/theme';
import { useAppContext } from '@/context/app-context';
import type { ResourceItem } from '@/context/types';
import { RESOURCES } from '@/data/resources';
import { useTheme } from '@/hooks/use-theme';

type TypeFilter = ResourceItem['type'] | 'all';
type LevelFilter = ResourceItem['level'] | 'all';

const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
  { label: 'All', value: 'all' },
  { label: '📱 Apps', value: 'app' },
  { label: '▶️ YouTube', value: 'youtube' },
  { label: '🎙️ Podcasts', value: 'podcast' },
  { label: '📚 Books', value: 'book' },
  { label: '🌐 Websites', value: 'website' },
];

const LEVEL_FILTERS: { label: string; value: LevelFilter }[] = [
  { label: 'All levels', value: 'all' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

export default function ResourcesScreen() {
  const colors = useTheme();
  const { settings, patchSettings } = useAppContext();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  const favoriteIds = new Set(
    settings.favorite_resource_ids.split(',').filter(Boolean)
  );

  function toggleFavorite(id: string) {
    const next = new Set(favoriteIds);
    next.has(id) ? next.delete(id) : next.add(id);
    patchSettings({ favorite_resource_ids: Array.from(next).join(',') });
  }

  async function openResource(url: string) {
    await WebBrowser.openBrowserAsync(url);
  }

  const filtered = RESOURCES.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (levelFilter !== 'all' && r.level !== levelFilter && r.level !== 'all') return false;
    return true;
  });

  // Favorites first
  const sorted = [
    ...filtered.filter(r => favoriteIds.has(r.id)),
    ...filtered.filter(r => !favoriteIds.has(r.id)),
  ];

  return (
    <ThemedView style={[styles.root, { backgroundColor: colors.cream }]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle" style={[styles.screenTitle, { color: colors.primary }]}>
            Resources
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {sorted.length} items
          </ThemedText>
        </View>

        {/* Type filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {TYPE_FILTERS.map(f => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={typeFilter === f.value}
              onPress={() => setTypeFilter(f.value)}
            />
          ))}
        </ScrollView>

        {/* Level filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {LEVEL_FILTERS.map(f => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={levelFilter === f.value}
              onPress={() => setLevelFilter(f.value)}
            />
          ))}
        </ScrollView>

        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.divider }]} />
          )}
          renderItem={({ item }) => (
            <ResourceRow
              item={item}
              isFavorite={favoriteIds.has(item.id)}
              onPress={() => openResource(item.url)}
              onToggleFavorite={() => toggleFavorite(item.id)}
            />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  screenTitle: { fontSize: 24, fontWeight: '700' },
  filterRow: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four + 16 + Spacing.one,
  },
});
