import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState, LoadingScreen, Screen, UnderlineTabs, ScrollToTopFab } from '@/src/shared/ui';
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
  const scrollRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    setShowScrollTop(event.nativeEvent.contentOffset.y > 600);
  }, []);

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  const showCreatedLoading =
    state.tab === 'created' && state.isLoadingCreated && listItems.length === 0;

  return (
    <View style={styles.root}>
      <Screen
        title="Weekly Planner"
        scroll
        refreshControl={state.refreshControl}
        contentStyle={styles.screenContent}
        scrollRef={scrollRef}
        onScroll={handleScroll}
      >
        <WeeklyPlannerHeaderCard {...header} />

        <View style={styles.tabsWrap}>
          <UnderlineTabs
            tabs={TABS}
            value={state.tab}
            onChange={(key) => actions.setTab(key as WeeklyPlannerTab)}
          />
        </View>

        {showCreatedLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.colors.primaryDark} />
          </View>
        ) : listItems.length === 0 ? (
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
            {state.tab === 'created' && state.canLoadMoreCreated ? (
              <Pressable
                onPress={() => {
                  void actions.loadMoreCreated();
                }}
                disabled={state.isLoadingMoreCreated}
                style={({ pressed }) => [
                  styles.loadMoreButton,
                  pressed ? styles.loadMorePressed : null,
                  state.isLoadingMoreCreated ? styles.loadMoreDisabled : null,
                ]}
              >
                {state.isLoadingMoreCreated ? (
                  <ActivityIndicator color={theme.colors.primaryDark} />
                ) : (
                  <Text style={styles.loadMoreText}>Load more weekly plans</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </Screen>
      <ScrollToTopFab
        visible={showScrollTop}
        onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
  loadingWrap: {
    paddingVertical: theme.spacing.s4,
    alignItems: 'center',
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.surface,
  },
  loadMorePressed: {
    opacity: 0.85,
  },
  loadMoreDisabled: {
    opacity: 0.6,
  },
  loadMoreText: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
});
