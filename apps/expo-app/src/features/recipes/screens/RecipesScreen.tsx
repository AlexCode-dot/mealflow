import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useRecipeDiscovery,
  useRecipeListView,
  useRecipesList,
  type RecipeListTabKey,
} from '@/src/features/recipes/hooks';
import {
  ActivityIndicator,
  FlatList,
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, ErrorText, EmptyState, FilterSheet, Button, ToastBanner } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';
import type { InspirationListItem, RecipeListItem } from '@/src/features/recipes/types';
import {
  RecipeSavedGridItem,
  RecipeDiscoveryListItem,
  RecipeListHeader,
  RecipePickerSheet,
} from '@/src/features/recipes/ui';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { ArrowUp } from 'lucide-react-native';
import { inspirationApi } from '@/src/features/recipes/api/inspirationApi';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { buildInspirationCreatePayload } from '@/src/features/recipes/utils/inspiration';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { RECIPE_CATEGORY_OPTIONS } from '@/src/features/recipes/constants/recipePickerOptions';

export function RecipesScreen() {
  const params = useLocalSearchParams<{ toast?: string }>();
  const toastParam = typeof params.toast === 'string' ? params.toast : null;
  const saved = useRecipesList();
  const view = useRecipeListView({
    savedItems: saved.items,
  });
  const discovery = useRecipeDiscovery({
    query: view.query,
    filters: view.discoveryFilters,
    enabled: view.tab === 'inspiration',
  });
  const toastState = useToastState();
  const [showToast, setShowToast] = useState(false);
  const isFocused = useIsFocused();
  const discoveryListRef = useRef<FlatList<InspirationListItem> | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [saveTarget, setSaveTarget] = useState<InspirationListItem | null>(null);
  const [savePickerOpen, setSavePickerOpen] = useState(false);
  const [saveCategory, setSaveCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { load: loadSaved } = saved;
  const { load: loadDiscovery } = discovery;
  const hasDiscoveryFilters = Boolean(view.query.trim() || view.activeFilterCount > 0);
  const savedFilterMode = view.discoveryFilters.hideSaved?.[0] ?? 'show';

  const savedLookup = useMemo(() => {
    const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
    const keys = saved.items
      .filter((item) => item.fromExternal)
      .map((item) => `${normalize(item.title)}|${normalize(item.imageUrl)}`);
    return new Set(keys);
  }, [saved.items]);

  const isDiscoverySaved = useCallback(
    (item: InspirationListItem) => {
      const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
      const key = `${normalize(item.title)}|${normalize(item.imageUrl)}`;
      return savedLookup.has(key);
    },
    [savedLookup],
  );

  const visibleDiscoveryItems = useMemo(() => {
    if (savedFilterMode === 'hide') {
      return discovery.items.filter((item) => !isDiscoverySaved(item));
    }
    if (savedFilterMode === 'saved') {
      return discovery.items.filter((item) => isDiscoverySaved(item));
    }
    return discovery.items;
  }, [discovery.items, isDiscoverySaved, savedFilterMode]);

  useFocusEffect(
    useCallback(() => {
      loadSaved();
      if (view.tab === 'inspiration') {
        loadDiscovery();
      }
    }, [loadDiscovery, loadSaved, view.tab]),
  );

  useEffect(() => {
    if (!toastParam || !isFocused) return undefined;

    setShowToast(false);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        if (toastParam === 'deleted') {
          toastState.show({ variant: 'error', message: 'Deleted successfully' });
        }
        router.setParams({ toast: undefined });
      }, 320);
    });

    return () => {
      task.cancel?.();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isFocused, toastParam, toastState]);

  useEffect(() => {
    if (!toastState.toast || !isFocused) {
      setShowToast(false);
      return;
    }
    setShowToast(true);
  }, [isFocused, toastState.toast]);

  const active = view.tab === 'saved' ? saved : discovery;
  const toastBanner =
    toastState.toast && showToast ? (
      <View style={styles.toast}>
        <ToastBanner
          variant={toastState.toast.variant}
          title={toastState.toast.title}
          message={toastState.toast.message}
          onTimeout={toastState.clear}
        />
      </View>
    ) : null;

  const handleScrollTop = useCallback(() => {
    discoveryListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleSavePress = useCallback((item: InspirationListItem) => {
    setSaveTarget(item);
    setSaveCategory('');
    setSavePickerOpen(true);
  }, []);

  const handleSaveConfirm = useCallback(async () => {
    if (!saveCategory) {
      toastState.show({ variant: 'error', message: 'Choose a category before saving.' });
      return;
    }
    if (!saveTarget) return;

    setIsSaving(true);
    try {
      const detail = await inspirationApi.get(saveTarget.id);
      const payload = buildInspirationCreatePayload(detail, saveCategory);
      await recipesApi.create(payload);
      toastState.show({ variant: 'success', message: 'Recipe saved.' });
      setSavePickerOpen(false);
      setSaveTarget(null);
      setSaveCategory('');
      await loadSaved();
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      toastState.show({ variant: 'error', title: 'Save failed', message: uiErr.message });
    } finally {
      setIsSaving(false);
    }
  }, [loadSaved, saveCategory, saveTarget, toastState]);

  return (
    <Screen title="Recipes" scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.root}>
        {toastBanner}
        {view.tab === 'saved' ? (
          <FlatList<RecipeListItem>
            key="saved"
            data={view.visibleSavedItems}
            keyExtractor={(r) => r.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            refreshControl={active.refreshControl}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={view.visibleSavedItems.length ? styles.gridRow : undefined}
            ListHeaderComponent={
              <View style={styles.headerBlock}>
                <RecipeListHeader
                  tabs={[...view.tabs]}
                  value={view.tab}
                  onChange={(k) => view.setTab(k as RecipeListTabKey)}
                  query={view.query}
                  onQueryChange={view.setQuery}
                  onFilterPress={() => view.setFiltersOpen(true)}
                  activeFilterCount={view.activeFilterCount}
                />

                {active.error ? (
                  <View style={styles.errorBox}>
                    <ErrorText>{active.error}</ErrorText>
                    <Pressable onPress={active.load} style={styles.retryBtn}>
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  </View>
                ) : null}

                {active.isLoading ? <Text style={styles.muted}>Loading recipes…</Text> : null}

                {!active.isLoading && !active.error && saved.items.length === 0 ? (
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
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <RecipeSavedGridItem item={item} onPress={(id) => router.push(routes.recipe(id))} />
            )}
          />
        ) : (
          <FlatList<InspirationListItem>
            key="inspiration"
            ref={discoveryListRef}
            data={visibleDiscoveryItems}
            keyExtractor={(r) => r.id}
            numColumns={1}
            showsVerticalScrollIndicator={false}
            onEndReached={discovery.loadMore}
            onEndReachedThreshold={0.4}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              setShowScrollTop(y > 500);
            }}
            refreshControl={active.refreshControl}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              view.tab === 'inspiration' ? (
                <View style={styles.listFooter}>
                  {discovery.isLoadingMore ? (
                    <ActivityIndicator color={theme.colors.primaryDark} />
                  ) : discovery.canLoadMore ? null : (
                    <Text style={styles.footerText}>No more recipes</Text>
                  )}
                </View>
              ) : null
            }
            ListHeaderComponent={
              <View style={styles.headerBlock}>
                <RecipeListHeader
                  tabs={[...view.tabs]}
                  value={view.tab}
                  onChange={(k) => view.setTab(k as RecipeListTabKey)}
                  query={view.query}
                  onQueryChange={view.setQuery}
                  onFilterPress={() => view.setFiltersOpen(true)}
                  activeFilterCount={view.activeFilterCount}
                />

                {active.error ? (
                  <View style={styles.errorBox}>
                    <ErrorText>{active.error}</ErrorText>
                    <Pressable onPress={active.load} style={styles.retryBtn}>
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  </View>
                ) : null}

                {active.isLoading ? <Text style={styles.muted}>Loading recipes…</Text> : null}

                {!active.isLoading && !active.error && discovery.items.length === 0 ? (
                  <EmptyState
                    title="No inspiration recipes"
                    description={
                      hasDiscoveryFilters
                        ? 'Try clearing filters or search for something else.'
                        : 'Try searching for a recipe or adjusting filters.'
                    }
                    action={
                      hasDiscoveryFilters ? (
                        <Button
                          title="Clear filters"
                          variant="secondary"
                          onPress={() => {
                            view.setQuery('');
                            view.clearSelection();
                          }}
                        />
                      ) : undefined
                    }
                  />
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <RecipeDiscoveryListItem
                item={item}
                onPress={(id) => router.push(routes.inspirationRecipe(id))}
                onSave={handleSavePress}
                isSaved={isDiscoverySaved(item)}
                saveDisabled={isSaving && saveTarget?.id === item.id}
              />
            )}
          />
        )}

        {view.tab === 'inspiration' && showScrollTop ? (
          <Pressable style={[styles.scrollTop, { top: 17, left: '50%' }]} onPress={handleScrollTop}>
            <ArrowUp color={theme.colors.textOnPrimary} size={26} strokeWidth={2.4} />
          </Pressable>
        ) : null}

        <FilterSheet
          visible={view.filtersOpen}
          sections={view.filterSections}
          selection={view.filterSelection}
          onUpdateSelection={view.updateSelection}
          onClear={view.clearSelection}
          onApply={() => view.setFiltersOpen(false)}
          onClose={() => view.setFiltersOpen(false)}
        />

        <RecipePickerSheet
          visible={savePickerOpen}
          title="Meal type"
          value={saveCategory}
          options={RECIPE_CATEGORY_OPTIONS}
          onChange={setSaveCategory}
          onClose={() => setSavePickerOpen(false)}
          onDone={handleSaveConfirm}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Remove Screen padding/gap so FlatList controls layout
  screenContent: {
    padding: 0,
    gap: 0,
  },
  root: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: theme.spacing.s3,
    paddingTop: theme.spacing.s3,
    // IMPORTANT: keeps last row clear of the notched tabbar + big + button
    paddingBottom: 170,
  },
  listFooter: {
    paddingTop: theme.spacing.s4,
    paddingBottom: theme.spacing.s6,
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollTop: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(93, 113, 66, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    transform: [{ translateX: -34 }],
    zIndex: 10,
  },

  headerBlock: {
    paddingBottom: theme.spacing.s3,
  },
  toast: {
    position: 'absolute',
    top: -theme.spacing.s6 - theme.spacing.s4,
    left: theme.spacing.s3,
    right: theme.spacing.s3,
    zIndex: 20,
  },

  errorBox: {
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.s4,
    gap: theme.spacing.s3,
  },

  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.surface,
  },

  retryText: {
    color: theme.colors.text,
    fontWeight: '800',
  },

  gridRow: {
    gap: 10,
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
