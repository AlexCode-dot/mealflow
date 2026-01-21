import { useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronRight, ShoppingBasket } from 'lucide-react-native';
import {
  UnderlineTabs,
  Screen,
  Card,
  Button,
  EmptyState,
  ErrorText,
  LoadingScreen,
  ToastBanner,
  ConfirmSheet,
} from '@/src/shared/ui';
import type { UnderlineTab } from '@/src/shared/ui/UnderlineTabs';
import { theme } from '@/src/shared/theme/theme';
import { useShoppingListOverviewScreen } from '@/src/features/shopping-lists/hooks/useShoppingListOverviewScreen';
import { ArchivedListCard } from '@/src/features/shopping-lists/ui/ArchivedListCard';

export default function ShoppingListOverviewScreen() {
  const view = useShoppingListOverviewScreen();
  const { state, data, actions, confirms, toast } = view;

  const tabs = useMemo<UnderlineTab[]>(
    () => [
      { key: 'current', label: 'Current List' },
      { key: 'archived', label: `Archived (${data.archivedLists.length})` },
    ],
    [data.archivedLists.length],
  );

  const stats = useMemo(() => {
    if (!data.activeList) return null;
    return [
      { label: 'Total', value: data.totalCount },
      { label: 'To Buy', value: data.uncheckedCount },
      { label: 'Checked', value: data.checkedCount },
    ];
  }, [data.activeList, data.checkedCount, data.totalCount, data.uncheckedCount]);

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  const toastBanner =
    toast.state.toast && toast.showToast ? (
      <View style={styles.toastOverlay} pointerEvents="box-none">
        <View style={[styles.toastWrap, { marginTop: toast.topInset + 8 }]} pointerEvents="none">
          <ToastBanner
            variant={toast.state.toast.variant}
            title={toast.state.toast.title}
            message={toast.state.toast.message}
            onTimeout={toast.state.clear}
          />
        </View>
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <Screen
        title="Shopping List"
        scroll
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
        }
        contentStyle={styles.content}
      >
        {state.error ? (
          <View style={styles.errorBlock}>
            <ErrorText>{state.error}</ErrorText>
            <Button title="Retry" onPress={actions.load} variant="secondary" />
          </View>
        ) : null}

        <Card style={styles.summaryCard} variant="premium">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>{data.activeList?.title ?? 'Active List'}</Text>
              <Text style={styles.summarySubtitle}>
                {data.activeList?.weeklyPlanId ? 'Linked to a weekly plan' : 'Manual list'}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            {stats?.map((stat) => (
              <View key={stat.label} style={styles.statBox}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressValue}>{data.progress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${data.progress}%` }]} />
            </View>
          </View>

          <Pressable
            onPress={actions.openActiveList}
            disabled={!data.activeList}
            style={({ pressed }) => [
              styles.openButton,
              pressed ? styles.openButtonPressed : null,
              !data.activeList ? styles.openButtonDisabled : null,
            ]}
          >
            <View style={styles.openButtonRow}>
              <ShoppingBasket size={22} color={theme.colors.primary} strokeWidth={2.6} />
              <Text style={styles.openButtonText}>
                {data.activeList ? 'Open List' : 'Create List'}
              </Text>
            </View>
            <ChevronRight style={styles.openButtonChevron} size={20} color={theme.colors.primary} />
          </Pressable>
        </Card>

        <View style={styles.tabsWrap}>
          <UnderlineTabs
            tabs={tabs}
            value={state.tab}
            onChange={(value) => actions.setTab(value as 'current' | 'archived')}
          />
        </View>

        {state.tab === 'current' ? (
          <View style={styles.currentSection}>
            <Card style={styles.tipCard}>
              <Text style={styles.tipTitle}>Your active list is above</Text>
              <Text style={styles.tipSubtitle}>
                Tap &quot;Open List&quot; to view and manage your shopping items.
              </Text>
            </Card>
            <Card style={styles.quickCard}>
              <Text style={styles.quickTitle}>Quick Actions</Text>
              <Pressable
                onPress={actions.requestGenerateFromCurrentWeek}
                disabled={state.isGenerating}
                style={({ pressed }) => [
                  styles.quickButton,
                  pressed ? styles.quickPressed : null,
                  state.isGenerating ? styles.quickDisabled : null,
                ]}
              >
                <CalendarDays size={18} color={theme.colors.textOnPrimary} />
                <Text style={styles.quickLabel}>
                  {state.isGenerating ? 'Generating...' : 'Generate from this week'}
                </Text>
              </Pressable>
            </Card>
          </View>
        ) : null}

        {state.tab === 'archived' ? (
          data.archivedLists.length === 0 ? (
            <EmptyState
              title="No archived lists"
              description="Archived shopping lists will show up here."
            />
          ) : (
            <View style={styles.archivedList}>
              {data.archivedLists.map((list) => (
                <ArchivedListCard
                  key={list.id}
                  title={list.title ?? `List · ${list.itemCount} items`}
                  updatedAt={list.updatedAt}
                  itemCount={list.itemCount}
                  onPress={() => actions.openArchivedList(list.id)}
                />
              ))}
            </View>
          )
        ) : null}
      </Screen>
      {toastBanner}

      <ConfirmSheet
        visible={confirms.generateOpen}
        title="Generate shopping list?"
        description="This will replace your active list with items from the current week."
        confirmLabel="Generate"
        onConfirm={confirms.confirmGenerate}
        onCancel={() => confirms.setGenerateOpen(false)}
        disabled={state.isGenerating}
        confirmVariant="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: theme.spacing.s1,
  },
  errorBlock: {
    gap: theme.spacing.s2,
  },
  summaryCard: {
    gap: theme.spacing.s4,
    marginBottom: theme.spacing.s4,
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textOnPrimary,
  },
  summarySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.iconMutedOnPrimary,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBlock: {
    gap: theme.spacing.s1,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.iconMutedOnPrimary,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textOnPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s3,
  },
  statBox: {
    flex: 1,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.s3,
    alignItems: 'center',
    backgroundColor: theme.colors.primaryDark,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textOnPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.iconMutedOnPrimary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(245,241,230,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
  },
  openButton: {
    paddingVertical: theme.spacing.s4,
    paddingHorizontal: theme.spacing.s4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
  },
  openButtonChevron: {
    position: 'absolute',
    right: theme.spacing.s4,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  openButtonPressed: {
    opacity: 0.9,
  },
  openButtonDisabled: {
    opacity: 0.6,
  },
  tabsWrap: {
    marginTop: theme.spacing.s2,
    marginBottom: 0,
  },
  tipCard: {
    alignItems: 'center',
    gap: theme.spacing.s2,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  tipSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  currentSection: {
    gap: theme.spacing.s2,
  },
  quickCard: {
    gap: theme.spacing.s3,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s2,
    paddingVertical: theme.spacing.s3,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryDark,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textOnPrimary,
  },
  quickPressed: {
    opacity: 0.9,
  },
  quickDisabled: {
    opacity: 0.6,
  },
  archivedList: {
    gap: theme.spacing.s2,
  },
  toastOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 5,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  toastWrap: {
    width: '92%',
  },
});
