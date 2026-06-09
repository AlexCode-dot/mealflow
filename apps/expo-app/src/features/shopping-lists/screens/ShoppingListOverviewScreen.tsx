import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { CalendarDays, ChevronRight, ShoppingBasket } from 'lucide-react-native';
import {
  UnderlineTabs,
  Screen,
  Card,
  EmptyState,
  ToastBanner,
  LoadingScreen,
  ConfirmSheet,
  useGlobalToast,
  ScrollToTopFab,
} from '@/src/shared/ui';
import type { UnderlineTab } from '@/src/shared/ui/UnderlineTabs';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { useShoppingListOverviewScreen } from '@/src/features/shopping-lists/hooks/useShoppingListOverviewScreen';
import { ArchivedListCard } from '@/src/features/shopping-lists/ui/ArchivedListCard';

export default function ShoppingListOverviewScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const view = useShoppingListOverviewScreen();
  const { state, data, actions, confirms, toast } = view;
  const { toast: globalToast } = useGlobalToast();
  const scrollRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    setShowScrollTop(event.nativeEvent.contentOffset.y > 600);
  }, []);

  const tabs = useMemo<UnderlineTab[]>(
    () => [
      { key: 'current', label: t('shoppingLists.currentList') },
      { key: 'archived', label: t('shoppingLists.archived', { count: data.archivedLists.length }) },
    ],
    [data.archivedLists.length, t],
  );

  const stats = useMemo(() => {
    if (!data.activeList) return null;
    return [
      { label: t('shoppingLists.total'), value: data.totalCount },
      { label: t('shoppingLists.toBuy'), value: data.uncheckedCount },
      { label: t('shoppingLists.checked'), value: data.checkedCount },
    ];
  }, [data.activeList, data.checkedCount, data.totalCount, data.uncheckedCount, t]);

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  const toastBanner =
    toast.state.toast && toast.showToast && !globalToast ? (
      <View style={[styles.toastOverlay, { pointerEvents: 'box-none' }]}>
        <View style={[styles.toastWrap, { marginTop: toast.topInset + 8, pointerEvents: 'none' }]}>
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
        title={t('shoppingLists.title')}
        scroll
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
        }
        contentStyle={styles.content}
        scrollRef={scrollRef}
        onScroll={handleScroll}
      >
        <Card style={styles.summaryCard} variant="premium">
          <View style={styles.summaryHeader}>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>
                {data.activeList?.title ?? t('shoppingLists.activeList')}
              </Text>
              <Text style={styles.summarySubtitle}>
                {data.activeList?.weeklyPlanId
                  ? t('shoppingLists.linkedToWeeklyPlan')
                  : t('shoppingLists.manualList')}
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
              <Text style={styles.progressLabel}>{t('shoppingLists.progress')}</Text>
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
              <ShoppingBasket size={22} color={theme.colors.primary} strokeWidth={2.0} />
              <Text style={styles.openButtonText}>
                {data.activeList ? t('shoppingLists.openList') : t('shoppingLists.createList')}
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
              <Text style={styles.tipTitle}>{t('shoppingLists.yourActiveListIsAbove')}</Text>
              <Text style={styles.tipSubtitle}>
                Tap &quot;Open List&quot; to view and manage your shopping items.
              </Text>
            </Card>
            <Card style={styles.quickCard}>
              <Text style={styles.quickTitle}>{t('shoppingLists.quickActions')}</Text>
              <Pressable
                onPress={actions.requestGenerateFromCurrentWeek}
                disabled={state.isGenerating}
                style={({ pressed }) => [
                  styles.quickRow,
                  pressed ? styles.quickPressed : null,
                  state.isGenerating ? styles.quickDisabled : null,
                ]}
              >
                <View style={styles.quickRowContent}>
                  <CalendarDays size={18} color={theme.colors.primaryDark} />
                  <Text style={styles.quickLabel}>
                    {state.isGenerating
                      ? t('shoppingLists.generatingList')
                      : t('shoppingLists.generateFromThisWeek')}
                  </Text>
                </View>
                <ChevronRight
                  size={18}
                  color={theme.colors.primaryDark}
                  style={styles.quickRowChevron}
                />
              </Pressable>
              <Text style={styles.quickHint}>
                Auto-generate shopping list from this week&apos;s meal plan.
              </Text>
            </Card>
          </View>
        ) : null}

        {state.tab === 'archived' ? (
          data.archivedLists.length === 0 ? (
            <EmptyState
              title={t('shoppingLists.noArchivedLists')}
              description={t('shoppingLists.archivedListsBody')}
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
              {state.canLoadMoreArchived ? (
                <Pressable
                  onPress={() => {
                    void actions.loadMoreArchived();
                  }}
                  disabled={state.isLoadingMoreArchived}
                  style={({ pressed }) => [
                    styles.loadMoreButton,
                    pressed ? styles.loadMorePressed : null,
                    state.isLoadingMoreArchived ? styles.loadMoreDisabled : null,
                  ]}
                >
                  {state.isLoadingMoreArchived ? (
                    <ActivityIndicator color={theme.colors.primaryDark} />
                  ) : (
                    <Text style={styles.loadMoreText}>{t('shoppingLists.loadMoreArchived')}</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          )
        ) : null}
      </Screen>
      {toastBanner}
      <ScrollToTopFab
        visible={showScrollTop}
        onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
      />

      <ConfirmSheet
        visible={confirms.generateOpen}
        title={t('shoppingLists.generateTitle')}
        description="This will replace your active list with items from the current week."
        confirmLabel={t('shoppingLists.generate')}
        onConfirm={confirms.confirmGenerate}
        onCancel={() => confirms.setGenerateOpen(false)}
        disabled={state.isGenerating}
        confirmVariant="primary"
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    content: {
      gap: theme.spacing.s1,
    },
    summaryCard: {
      gap: theme.spacing.s4,
      marginBottom: theme.spacing.s4,
      backgroundColor: theme.colors.primaryDark,
      borderColor: theme.colors.primaryDark,
      padding: theme.spacing.s5,
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
      gap: theme.spacing.s2,
    },
    statBox: {
      flex: 1,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.s3,
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: theme.colors.primaryLight,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.textOnPrimary,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primaryLight,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.35)',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
    },
    openButton: {
      marginTop: theme.spacing.s1,
      paddingVertical: theme.spacing.s4,
      paddingHorizontal: theme.spacing.s4,
      borderRadius: theme.radius.md,
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
      fontWeight: '700',
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
    quickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.s2,
      paddingVertical: theme.spacing.s3,
      paddingHorizontal: theme.spacing.s3,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1.5,
      borderColor: theme.colors.primaryDark,
    },
    quickRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
    },
    quickRowChevron: {
      position: 'absolute',
      right: theme.spacing.s3,
    },
    quickLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.primaryDark,
    },
    quickPressed: {
      opacity: 0.9,
    },
    quickDisabled: {
      opacity: 0.6,
    },
    quickHint: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    archivedList: {
      gap: theme.spacing.s2,
    },
    loadMoreButton: {
      marginTop: theme.spacing.s2,
      paddingVertical: theme.spacing.s3,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    loadMorePressed: {
      opacity: 0.85,
    },
    loadMoreDisabled: {
      opacity: 0.7,
    },
    loadMoreText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primaryDark,
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
