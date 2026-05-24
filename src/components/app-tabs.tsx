import { Tabs } from 'expo-router';

// The visual tab bar is replaced by the custom BottomNav overlay in
// src/app/(tabs)/_layout.tsx. This component only registers the routes
// and suppresses both the default header and the native tab bar.
export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index"      />
      <Tabs.Screen name="flashcards" />
      <Tabs.Screen name="log"        />
      <Tabs.Screen name="resources"  />
      <Tabs.Screen name="settings"   />
    </Tabs>
  );
}
