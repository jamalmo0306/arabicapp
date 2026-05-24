import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';

// TabTrigger components must be present to register routes with the navigator,
// but the TabList is visually hidden (height: 0, overflow: hidden) because
// navigation is handled entirely by the custom BottomNav overlay in _layout.tsx.
export default function AppTabs() {
  return (
    <Tabs style={s.container}>
      <TabSlot style={s.slot} />
      <TabList style={s.hiddenList}>
        <TabTrigger name="home"       href="/"          ><View /></TabTrigger>
        <TabTrigger name="flashcards" href="/flashcards" ><View /></TabTrigger>
        <TabTrigger name="log"        href="/log"        ><View /></TabTrigger>
        <TabTrigger name="resources"  href="/resources"  ><View /></TabTrigger>
        <TabTrigger name="settings"   href="/settings"   ><View /></TabTrigger>
      </TabList>
    </Tabs>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1 },
  slot:       { flex: 1 },
  hiddenList: { height: 0, overflow: 'hidden', opacity: 0 },
});
