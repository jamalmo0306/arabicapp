import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
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
import type { ResourceItem } from '@/context/types';
import { RESOURCES } from '@/data/resources';

// ── Colors (mirrors HomeScreen palette) ───────────────────────────────────────
const C = {
  bg:          '#15150F',
  scrollBg:    '#CBB77C',
  blackGlass:  'rgba(14, 15, 15, 0.88)',
  borderGold:  'rgba(255, 213, 121, 0.13)',
  gold:        '#F7C653',
  goldSoft:    'rgba(247, 198, 83, 0.18)',
  olive:       '#9BC76D',
  oliveDim:    'rgba(118, 147, 70, 0.28)',
  mutedLight:  '#CFC4AE',
  textLight:   '#F7E8C0',
  white:       '#FFFFFF',
  chipInactive:'rgba(14, 15, 15, 0.75)',
  chipBorder:  'rgba(255, 213, 121, 0.22)',
};

// ── Filter definitions (unchanged) ────────────────────────────────────────────
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

// ── Level badge colours ────────────────────────────────────────────────────────
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

// ── Custom filter chip ─────────────────────────────────────────────────────────
function Chip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[s.chip, active && s.chipActive]}
    >
      <Text style={[s.chipLabel, active && s.chipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Custom resource card ───────────────────────────────────────────────────────
function ResourceCard({
  item, isFavorite, onPress, onToggleFavorite,
}: {
  item: ResourceItem;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
    >
      {/* Top row: emoji + title + fav */}
      <View style={s.cardTop}>
        <Text style={s.cardEmoji}>{TYPE_EMOJI[item.type]}</Text>
        <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
        <TouchableOpacity onPress={onToggleFavorite} hitSlop={10} style={s.favBtn}>
          <Text style={s.favIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>

      {/* Badges row */}
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
  const { settings, patchSettings } = useAppContext();
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
      <StatusBar barStyle="dark-content" backgroundColor={C.scrollBg} />

      <SafeAreaView style={s.safe} edges={['top']}>

        {/* ── HEADER (not inside the scroll) ── */}
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

          {/* Type filter strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterStrip}
          >
            {TYPE_FILTERS.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                active={typeFilter === f.value}
                onPress={() => setTypeFilter(f.value)}
              />
            ))}
          </ScrollView>

          {/* Level filter strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterStrip}
          >
            {LEVEL_FILTERS.map(f => (
              <Chip
                key={f.value}
                label={f.label}
                active={levelFilter === f.value}
                onPress={() => setLevelFilter(f.value)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── RESOURCE LIST ── */}
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
            />
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      </SafeAreaView>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.scrollBg },

  // ─ Header section (sits above the list, on sandy bg) ─
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
    color: '#2C251C',
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
    color: '#2C251C',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─ Filter strips ─
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
    color: '#2C251C',
    fontWeight: '800',
  },

  // ─ List ─
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 140,
  },
  sep: { height: 10 },

  // ─ Resource card ─
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

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: { fontSize: 22 },
  cardTitle: {
    flex: 1,
    color: C.textLight,
    fontSize: 15,
    fontWeight: '700',
  },
  favBtn:  { padding: 4 },
  favIcon: { fontSize: 20 },

  cardDesc: {
    color: C.mutedLight,
    fontSize: 13,
    lineHeight: 19,
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badgeFree: {
    backgroundColor: C.oliveDim,
  },
  badgeText: {
    fontSize: 11,
    color: C.white,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
