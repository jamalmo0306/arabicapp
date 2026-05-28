import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

const C = {
  olive:         '#9BC76D',
  navBg:         'rgba(21, 22, 22, 0.92)',
  navBorder:     'rgba(255,255,255,0.08)',
  navActiveTab:  'rgba(118, 147, 70, 0.32)',
  iconInactive:  '#D6D6D6',
  labelInactive: '#D2D2D2',
};

const TABS = [
  { name: 'index',      route: '/(tabs)/',           icon: '🏠', label: 'Home'    },
  { name: 'flashcards', route: '/(tabs)/flashcards',  icon: '🎴', label: 'Cards'   },
  { name: 'log',        route: '/(tabs)/log',         icon: '📊', label: 'Log'     },
  { name: 'music',      route: '/(tabs)/music',       icon: '🎵', label: 'Music'   },
  { name: 'resources',  route: '/(tabs)/resources',   icon: '📖', label: 'Library' },
  { name: 'settings',   route: '/(tabs)/settings',    icon: '⚙️', label: 'Settings'},
] as const;

export default function BottomNav() {
  const router   = useRouter();
  const segments = useSegments();

  // Last segment is the tab name: 'index' | 'flashcards' | 'log' | ...
  const activeTab = (segments[segments.length - 1] as string) ?? 'index';

  return (
    <View style={s.wrap}>
      {TABS.map(tab => {
        const isActive = tab.name === activeTab;
        return (
          <TouchableOpacity
            key={tab.name}
            style={[s.item, isActive && s.itemActive]}
            activeOpacity={0.75}
            onPress={() => {
              if (!isActive) router.push(tab.route as any);
            }}
          >
            <Text style={isActive ? s.iconActive : s.icon}>{tab.icon}</Text>
            <Text style={isActive ? s.labelActive : s.label}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 80,
    borderRadius: 22,
    backgroundColor: C.navBg,
    borderWidth: 1,
    borderColor: C.navBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  item: {
    flex: 1,
    height: 62,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive:  { backgroundColor: C.navActiveTab },
  icon:        { fontSize: 20, color: C.iconInactive, marginBottom: 4 },
  iconActive:  { fontSize: 22, marginBottom: 4 },
  label:       { color: C.labelInactive, fontSize: 10, fontWeight: '700' },
  labelActive: { color: C.olive, fontSize: 10, fontWeight: '800' },
});
