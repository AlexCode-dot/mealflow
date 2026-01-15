import { useCallback, useEffect, useState } from 'react';
import {
  useRecipeDiscovery,
  useRecipeListView,
  useRecipesList,
  type DiscoveryRecipe,
  type RecipeListTabKey,
} from '@/src/features/recipes/hooks';
import { FlatList, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, ErrorText, EmptyState, FilterSheet, Button, ToastBanner } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';
import type { RecipeListItem } from '@/src/features/recipes/types';
import {
  RecipeSavedGridItem,
  RecipeDiscoveryListItem,
  RecipeListHeader,
} from '@/src/features/recipes/ui';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

export function RecipesScreen() {
  const params = useLocalSearchParams<{ toast?: string }>();
  const toastParam = typeof params.toast === 'string' ? params.toast : null;
  const saved = useRecipesList();
  const discovery = useRecipeDiscovery();
  const toastState = useToastState();
  const [showToast, setShowToast] = useState(false);
  const isFocused = useIsFocused();

  const { load: loadSaved } = saved;
  const { load: loadDiscovery } = discovery;

  useFocusEffect(
    useCallback(() => {
      loadSaved();
      loadDiscovery();
    }, [loadDiscovery, loadSaved]),
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

  const view = useRecipeListView({
    savedItems: saved.items,
    discoveryItems: discovery.items,
  });

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
          <FlatList<DiscoveryRecipe>
            key="inspiration"
            data={view.visibleDiscoveryItems}
            keyExtractor={(r) => r.id}
            numColumns={1}
            showsVerticalScrollIndicator={false}
            refreshControl={active.refreshControl}
            contentContainerStyle={styles.listContent}
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
                  hint="Inspiration will be added later. This tab is here to match the Figma layout."
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
              </View>
            }
            renderItem={({ item }) => <RecipeDiscoveryListItem item={item} onPress={() => {}} />}
          />
        )}

        <FilterSheet
          visible={view.filtersOpen}
          sections={view.filterSections}
          selection={view.filterSelection}
          onUpdateSelection={view.updateSelection}
          onClear={view.clearSelection}
          onApply={() => view.setFiltersOpen(false)}
          onClose={() => view.setFiltersOpen(false)}
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
