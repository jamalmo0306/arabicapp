import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { useAppContext } from '@/context/app-context';
import type { AppColors } from '@/lib/theme';
import type { ResourceItem } from '@/context/types';
import { RESOURCES } from '@/data/resources';

// ── Filter definitions ────────────────────────────────────────────────────────
type TypeFilter  = ResourceItem['type']  | 'all';
type LevelFilter = ResourceItem['level'] | 'all';

const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
  { label: 'All',       value: 'all'     },
  { label: '📱 Apps',   value: 'app'     },
  { label: '▶️ YouTube', value: 'youtube' },
  { label: '🎙️ Podcasts', value: 'podcast'},
  { label: '📚 Books',  value: 'book'    },
  { label: '🌐 Websites', value: 'website'},
];

const LEVEL_FILTERS: { label: string; value: LevelFilter }[] = [
  { label: 'All levels',   value: 'all'         },
  { label: '🌱 Beginner',  value: 'beginner'    },
  { label: '📈 Intermediate', value: 'intermediate'},
  { label: '🔥 Advanced',  value: 'advanced'    },
];

const LEVEL_COLOR: Record<ResourceItem['level'], string> = {
  beginner:     '#4A9E5C',
  intermediate: '#C9952A',
  advanced:     '#C0392B',
  all:          '#6B8A53',
};

const TYPE_EMOJI: Record<ResourceItem['type'], string> = {
  app:     '📱',
  youtube: '▶️',
  podcast: '🎙️',
  book:    '📚',
  website: '🌐',
};

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ label, active, onPress, s }: {
  label: string; active: boolean; onPress: () => void;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipLabel, active && s.chipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── ResourceCard ──────────────────────────────────────────────────────────────
function ResourceCard({ item, isFavorite, onPress, onToggleFavorite, s }: {
  item: ResourceItem;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.cardPressed]}>
      <View style={s.cardTop}>
        <Text style={s.cardEmoji}>{TYPE_EMOJI[item.type]}</Text>
        <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
        <TouchableOpacity onPress={onToggleFavorite} hitSlop={10} style={s.favBtn}>
          <Text style={s.favIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
      <View style={s.badgeRow}>
        <View style={[s.badge, { backgroundColor: LEVEL_COLOR[item.level] }]}>
          <Text style={s.badgeText}>{item.level}</Text>
        </View>
        {item.isFree && (
          <View style={[s.badge, s.badgeFree]}>
            <Text style={s.badgeText}>free</Text>
          </View>
        )}
        <View style={s.badge}>
          <Text style={s.badgeText}>{item.type}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function ResourcesScreen() {
  const { settings, patchSettings, colors } = useAppContext();
  const C = colors;
  const s = useMemo(() => makeStyles(C), [C]);

  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  const favoriteIds = new Set(
    settings.favorite_resource_ids.split(',').filter(Boolean),
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
    if (typeFilter  !== 'all' && r.type  !== typeFilter)                        return false;
    if (levelFilter !== 'all' && r.level !== levelFilter && r.level !== 'all') return false;
    return true;
  });

  const sorted = [
    ...filtered.filter(r =>  favoriteIds.has(r.id)),
    ...filtered.filter(r => !favoriteIds.has(r.id)),
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={C.statusBar} backgroundColor={C.statusBarBg} />

      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.headerWrap}>
          <View style={s.headerRow}>
            <View style={s.logoRow}>
              <Text style={s.logoIcon}>📚</Text>
              <Text style={s.title}>Resources</Text>
            </View>
            <View style={s.countPill}>
              <Text style={s.countText}>{sorted.length} items</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterStrip}>
            {TYPE_FILTERS.map(f => (
              <Chip key={f.value} label={f.label} active={typeFilter === f.value} onPress={() => setTypeFilter(f.value)} s={s} />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterStrip}>
            {LEVEL_FILTERS.map(f => (
              <Chip key={f.value} label={f.label} active={levelFilter === f.value} onPress={() => setLevelFilter(f.value)} s={s} />
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={sorted}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ResourceCard
              item={item}
              isFavorite={favoriteIds.has(item.id)}
              onPress={() => openResource(item.url)}
              onToggleFavorite={() => toggleFavorite(item.id)}
              s={s}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      </SafeAreaView>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
function makeStyles(C: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.scrollBg },

    headerWrap: {
      backgroundColor: C.scrollBg,
      paddingTop: 16,
      paddingBottom: 10,
      gap: 6,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    logoRow:  { flexDirection: 'row', alignItems: 'center' },
    logoIcon: { fontSize: 32, marginRight: 10 },
    title: {
      color: C.textDark,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    countPill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: C.goldSoft,
      borderWidth: 1,
      borderColor: 'rgba(247,198,83,0.4)',
    },
    countText: {
      color: C.textDark,
      fontSize: 12,
      fontWeight: '700',
    },

    filterStrip: {
      paddingHorizontal: 16,
      paddingVertical: 2,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: C.chipInactive,
      borderWidth: 1.5,
      borderColor: C.chipBorder,
    },
    chipActive: {
      backgroundColor: C.goldSoft,
      borderColor: C.gold,
    },
    chipLabel: {
      color: C.mutedLight,
      fontSize: 13,
      fontWeight: '600',
    },
    chipLabelActive: {
      color: C.textDark,
      fontWeight: '800',
    },

    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 140,
    },
    sep: { height: 10 },

    card: {
      backgroundColor: C.blackGlass,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.borderGold,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 8,
    },
    cardPressed: { opacity: 0.8 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardEmoji: { fontSize: 22 },
    cardTitle: { flex: 1, color: C.textLight, fontSize: 15, fontWeight: '700' },
    favBtn:  { padding: 4 },
    favIcon: { fontSize: 20 },
    cardDesc: { color: C.mutedLight, fontSize: 13, lineHeight: 19 },
    badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    badgeFree: { backgroundColor: C.oliveDim },
    badgeText: { fontSize: 11, color: C.white, fontWeight: '700', textTransform: 'capitalize' },
  });
}
