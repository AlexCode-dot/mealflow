import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppTabBar, BottomBarProvider } from '@/src/shared/ui';
import { AddRecipeSheetProvider } from '@/src/features/recipes/ui';

export default function AppLayout() {
  const { t } = useTranslation();
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

          <Tabs.Screen name="recipes" options={{ title: t('recipes.title') }} />
          <Tabs.Screen name="shopping-list" options={{ title: t('shoppingLists.title') }} />
          <Tabs.Screen name="overview" options={{ title: t('overview.title') }} />
          <Tabs.Screen name="weekly-planner" options={{ title: t('weeklyPlans.title') }} />
          <Tabs.Screen name="settings" options={{ title: t('settings.title') }} />
        </Tabs>
      </AddRecipeSheetProvider>
    </BottomBarProvider>
  );
}
