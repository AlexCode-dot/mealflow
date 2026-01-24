import { StyleSheet, View } from 'react-native';
import { EmptyState, LoadingScreen, Screen, UnderlineTabs } from '@/src/shared/ui';
import type { UnderlineTab } from '@/src/shared/ui/UnderlineTabs/UnderlineTabs';
import {
  useWeeklyPlannerScreen,
  type WeeklyPlannerTab,
} from '@/src/features/weekly-plans/hooks/useWeeklyPlannerScreen';
import { WeeklyPlannerHeaderCard } from '@/src/features/weekly-plans/ui/WeeklyPlannerHeaderCard';
import { WeeklyPlanListCard } from '@/src/features/weekly-plans/ui/WeeklyPlanListCard';
import { theme } from '@/src/shared/theme/theme';

const TABS: UnderlineTab[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'window', label: 'Upcoming' },
  { key: 'created', label: 'All created' },
];

export default function WeeklyPlannerScreen() {
  const view = useWeeklyPlannerScreen();
  const { state, actions, header, listItems } = view;

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Screen
      title="Weekly Planner"
      scroll
      refreshControl={state.refreshControl}
      contentStyle={styles.screenContent}
    >
      <WeeklyPlannerHeaderCard {...header} />

      <View style={styles.tabsWrap}>
        <UnderlineTabs
          tabs={TABS}
          value={state.tab}
          onChange={(key) => actions.setTab(key as WeeklyPlannerTab)}
        />
      </View>

      {listItems.length === 0 ? (
        <EmptyState
          title="No weekly plans yet"
          description="Create your first week to get started."
        />
      ) : (
        <View style={styles.list}>
          {listItems.map((item) => (
            <WeeklyPlanListCard
              key={item.key}
              title={item.title}
              rangeLabel={item.rangeLabel}
              isCurrent={item.isCurrent}
              mode={item.mode}
              mealCount={item.mealCount}
              statusLabel={item.statusLabel}
              hasPlan={item.hasPlan}
              onPress={item.onPress}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: theme.spacing.s1,
  },
  tabsWrap: {
    marginTop: theme.spacing.s2,
    marginBottom: 0,
  },
  list: {
    gap: theme.spacing.s2,
  },
});
