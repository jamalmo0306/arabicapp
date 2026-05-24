import { View } from 'react-native';
import AppTabs from '@/components/app-tabs';
import BottomNav from '@/components/bottom-nav';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <AppTabs />
      <BottomNav />
    </View>
  );
}
