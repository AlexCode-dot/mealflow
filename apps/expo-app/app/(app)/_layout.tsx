import { Tabs } from 'expo-router';
import { AppTabBar, BottomBarProvider } from '@/src/shared/ui';
import { AddRecipeSheetProvider } from '@/src/features/recipes/ui';

export default function AppLayout() {
  return (
    <BottomBarProvider>
      <AddRecipeSheetProvider>
        <Tabs
          tabBar={(props) => <AppTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            // Keep the default header off — we render our own AppHeader in <Screen />
            tabBarStyle: {
              backgroundColor: 'transparent',
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
      </AddRecipeSheetProvider>
    </BottomBarProvider>
  );
}
