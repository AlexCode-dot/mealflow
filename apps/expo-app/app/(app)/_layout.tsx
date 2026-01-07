import { Tabs } from 'expo-router';
import { theme } from '@/src/shared/theme/theme';
import { AppTabBar } from '@/src/shared/ui';

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Keep the default header off — we render our own AppHeader in <Screen />
        tabBarStyle: {
          backgroundColor: theme.colors.primary,
        },
      }}
    >
      {/* Hidden route (not shown as a tab) */}
      <Tabs.Screen name="profile" options={{ href: null }} />

      <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
      <Tabs.Screen name="shopping-list" options={{ title: 'Shopping List' }} />
      <Tabs.Screen name="overview" options={{ title: 'Overview' }} />
      <Tabs.Screen name="weekly-planner" options={{ title: 'Weekly Planner' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
