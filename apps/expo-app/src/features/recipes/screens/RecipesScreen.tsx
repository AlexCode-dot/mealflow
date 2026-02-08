import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Screen,
  EmptyState,
  FilterSheet,
  Button,
  ToastBanner,
  useGlobalToast,
  ScrollToTopFab,
} from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { routes } from '@/src/core/navigation/routes';
import type { InspirationListItem, RecipeListItem } from '@/src/features/recipes/types';
import { RECIPE_CATEGORY_OPTIONS } from '@/src/features/recipes/constants/recipePickerOptions';
import {
  RecipeSavedGridItem,
  RecipeDiscoveryListItem,
  RecipeListHeader,
  RecipePickerSheet,
} from '@/src/features/recipes/ui';
import { useRecipesScreen, type RecipeListTabKey } from '@/src/features/recipes/hooks';

export function RecipesScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const view = useRecipesScreen();
  const { state, filters, data, actions, toast, savedListRef, discoveryListRef } = view;
  const { toast: globalToast } = useGlobalToast();
  const [savedScrolled, setSavedScrolled] = useState(false);
  const [discoveryScrolled, setDiscoveryScrolled] = useState(false);
  const allowDiscoveryLoadMore = data.savedFilterMode !== 'saved';
  const showSavedEndMessage =
    !data.saved.canLoadMore && data.visibleSavedItems.length >= 8 && savedScrolled;
  const showDiscoveryEndMessage =
    !data.discovery.canLoadMore && data.visibleDiscoveryItems.length >= 8 && discoveryScrolled;
  const showDiscoveryReset =
    !state.hasDiscoveryFilters && !data.discovery.canLoadMore && discoveryScrolled;

  const active = state.tab === 'saved' ? data.saved : data.discovery;
  const toastBanner =
    toast.state.toast && state.showToast && !globalToast ? (
      <View style={styles.toast}>
        <ToastBanner
          variant={toast.state.toast.variant}
          title={toast.state.toast.title}
          message={toast.state.toast.message}
          onTimeout={toast.state.clear}
        />
      </View>
    ) : null;

  const renderHeader = useCallback(
    (mode: 'saved' | 'inspiration') => {
      const list = mode === 'saved' ? data.saved : data.discovery;
      const emptyState =
        mode === 'saved' ? (
          <EmptyState
            title="No recipes yet"
            description="Tap the + button or use the button below to create your first recipe."
            action={
              <Button
                title="Create your first recipe"
                variant="primary"
                onPress={() => router.push(routes.recipeNew)}
              />
            }
          />
        ) : (
          <EmptyState
            title="No inspiration recipes"
            description={
              state.hasDiscoveryFilters
                ? 'Try clearing filters or search for something else.'
                : 'Try searching for a recipe or adjusting filters.'
            }
            action={
              state.hasDiscoveryFilters ? (
                <Button
                  title="Clear filters"
                  variant="secondary"
                  onPress={() => {
                    filters.setQuery('');
                    filters.clearSelection();
                  }}
                />
              ) : undefined
            }
          />
        );

      const emptyCount = mode === 'saved' ? data.saved.items.length : data.discovery.items.length;

      return (
        <View style={styles.headerBlock}>
          <RecipeListHeader
            tabs={[...filters.tabs]}
            value={state.tab}
            onChange={(k) => actions.setTab(k as RecipeListTabKey)}
            query={filters.query}
            onQueryChange={filters.setQuery}
            onFilterPress={() => filters.setFiltersOpen(true)}
            activeFilterCount={filters.activeFilterCount}
          />

          {list.isLoading ? <Text style={styles.muted}>Loading recipes…</Text> : null}

          {!list.isLoading && !list.error && emptyCount === 0 ? emptyState : null}
        </View>
      );
    },
    [
      actions,
      data,
      filters,
      state.hasDiscoveryFilters,
      state.tab,
      styles.headerBlock,
      styles.muted,
    ],
  );

  useEffect(() => {
    if (state.tab === 'saved') {
      setDiscoveryScrolled(false);
    } else {
      setSavedScrolled(false);
    }
  }, [state.tab]);

  return (
    <Screen title="Recipes" scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.root}>
        {toastBanner}
        {state.tab === 'saved' ? (
          <FlatList<RecipeListItem>
            key="saved"
            ref={savedListRef}
            data={data.visibleSavedItems}
            keyExtractor={(r) => r.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            onEndReached={data.saved.canLoadMore ? data.saved.loadMore : undefined}
            onEndReachedThreshold={0.4}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              actions.handleSavedScroll(y);
              if (!savedScrolled && y > 60) setSavedScrolled(true);
            }}
            refreshControl={active.refreshControl}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={data.visibleSavedItems.length ? styles.gridRow : undefined}
            ListFooterComponent={
              <View style={styles.listFooter}>
                {data.saved.isLoadingMore ? (
                  <ActivityIndicator color={theme.colors.primaryDark} />
                ) : data.saved.canLoadMore || !showSavedEndMessage ? null : (
                  <Text style={styles.footerText}>No more recipes</Text>
                )}
              </View>
            }
            ListHeaderComponent={renderHeader('saved')}
            renderItem={({ item }) => (
              <RecipeSavedGridItem item={item} onPress={(id) => router.push(routes.recipe(id))} />
            )}
          />
        ) : (
          <FlatList<InspirationListItem>
            key="inspiration"
            ref={discoveryListRef}
            data={data.visibleDiscoveryItems}
            keyExtractor={(r) => r.id}
            numColumns={1}
            showsVerticalScrollIndicator={false}
            onEndReached={allowDiscoveryLoadMore ? data.discovery.loadMore : undefined}
            onEndReachedThreshold={0.4}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              actions.handleDiscoveryScroll(y);
              if (!discoveryScrolled && y > 60) setDiscoveryScrolled(true);
            }}
            refreshControl={active.refreshControl}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              state.tab === 'inspiration' ? (
                <View style={styles.listFooter}>
                  {data.discovery.isLoadingMore ? (
                    <ActivityIndicator color={theme.colors.primaryDark} />
                  ) : data.discovery.canLoadMore || !showDiscoveryEndMessage ? null : (
                    <View style={styles.footerActions}>
                      <Text style={styles.footerText}>No more recipes</Text>
                      {showDiscoveryReset ? (
                        <Button
                          title="Get a fresh batch"
                          variant="secondary"
                          size="small"
                          onPress={actions.handleDiscoveryReset}
                        />
                      ) : null}
                    </View>
                  )}
                </View>
              ) : null
            }
            ListHeaderComponent={renderHeader('inspiration')}
            renderItem={({ item }) => (
              <RecipeDiscoveryListItem
                item={item}
                onPress={(id) => router.push(routes.inspirationRecipe(id))}
                onSave={actions.handleSavePress}
                isSaved={data.isDiscoverySaved(item)}
                saveDisabled={state.isSaving && data.saveTarget?.id === item.id}
              />
            )}
          />
        )}

        <ScrollToTopFab visible={state.showScrollTop} onPress={actions.handleScrollTop} />

        <FilterSheet
          visible={filters.filtersOpen}
          onClose={() => filters.setFiltersOpen(false)}
          sections={filters.filterSections}
          selection={filters.filterSelection}
          onUpdateSelection={filters.updateSelection}
          onClear={filters.clearSelection}
          onApply={() => filters.setFiltersOpen(false)}
        />

        <RecipePickerSheet
          visible={state.savePickerOpen}
          title="Pick meal type"
          value={state.saveCategory}
          options={RECIPE_CATEGORY_OPTIONS}
          onChange={actions.setSaveCategory}
          onClose={() => actions.setSavePickerOpen(false)}
          onDone={actions.handleSaveConfirm}
        />
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screenContent: {
      padding: 0,
      gap: 0,
    },
    root: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    listContent: {
      paddingBottom: theme.spacing.s6,
      paddingHorizontal: theme.spacing.s3,
    },
    gridRow: {
      gap: theme.spacing.s2,
    },
    headerBlock: {
      gap: theme.spacing.s3,
      paddingTop: theme.spacing.s3,
      paddingBottom: theme.spacing.s4,
    },
    muted: {
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    listFooter: {
      paddingVertical: theme.spacing.s4,
      alignItems: 'center',
    },
    footerActions: {
      alignItems: 'center',
      gap: theme.spacing.s2,
    },
    footerText: {
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    toast: {
      position: 'absolute',
      top: -theme.spacing.s6 - theme.spacing.s4,
      left: theme.spacing.s3,
      right: theme.spacing.s3,
      zIndex: 5,
    },
  });
