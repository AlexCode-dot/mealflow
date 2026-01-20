import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useRecipeDiscovery } from '@/src/features/recipes/hooks/useRecipeDiscovery';
import { useRecipeListView } from '@/src/features/recipes/hooks/useRecipeListView';
import { useRecipesList } from '@/src/features/recipes/hooks/useRecipesList';
import type { InspirationListItem, RecipeListItem } from '@/src/features/recipes/types';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { inspirationApi } from '@/src/features/recipes/api/inspirationApi';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { buildInspirationCreatePayload } from '@/src/features/recipes/utils/inspiration';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';

export type RecipesScreenState = {
  tab: ReturnType<typeof useRecipeListView>['tab'];
  showToast: boolean;
  showScrollTop: boolean;
  savePickerOpen: boolean;
  saveCategory: string;
  isSaving: boolean;
  hasDiscoveryFilters: boolean;
};

export type RecipesScreenFilters = {
  tabs: ReturnType<typeof useRecipeListView>['tabs'];
  query: string;
  setQuery: (value: string) => void;
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean) => void;
  filterSections: ReturnType<typeof useRecipeListView>['filterSections'];
  filterSelection: ReturnType<typeof useRecipeListView>['filterSelection'];
  activeFilterCount: number;
  updateSelection: ReturnType<typeof useRecipeListView>['updateSelection'];
  clearSelection: ReturnType<typeof useRecipeListView>['clearSelection'];
};

export type RecipesScreenData = {
  saved: ReturnType<typeof useRecipesList>;
  discovery: ReturnType<typeof useRecipeDiscovery>;
  visibleSavedItems: RecipeListItem[];
  visibleDiscoveryItems: InspirationListItem[];
  savedFilterMode: string;
  saveTarget: InspirationListItem | null;
  isDiscoverySaved: (item: InspirationListItem) => boolean;
};

export type RecipesScreenActions = {
  setTab: (value: ReturnType<typeof useRecipeListView>['tab']) => void;
  setSaveCategory: (value: string) => void;
  setSavePickerOpen: (value: boolean) => void;
  handleScrollTop: () => void;
  handleSavePress: (item: InspirationListItem) => void;
  handleSaveConfirm: () => Promise<void>;
  handleDiscoveryScroll: (offsetY: number) => void;
};

export type RecipesScreenToast = {
  state: ReturnType<typeof useToastState>;
  showToast: boolean;
};

export type RecipesScreenView = {
  state: RecipesScreenState;
  filters: RecipesScreenFilters;
  data: RecipesScreenData;
  actions: RecipesScreenActions;
  toast: RecipesScreenToast;
  discoveryListRef: RefObject<FlatList<InspirationListItem> | null>;
};

export function useRecipesScreen(): RecipesScreenView {
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
      void loadSaved();
      if (view.tab === 'inspiration') {
        void loadDiscovery();
      }
    }, [loadDiscovery, loadSaved, view.tab]),
  );

  useEffect(() => {
    if (!toastParam || !isFocused) return undefined;

    setShowToast(false);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    timeoutId = setTimeout(() => {
      if (toastParam === 'deleted') {
        toastState.show({ variant: 'error', message: 'Deleted successfully' });
      }
      router.setParams({ toast: undefined });
    }, 320);

    return () => {
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

  const handleDiscoveryScroll = useCallback((offsetY: number) => {
    setShowScrollTop(offsetY > 500);
  }, []);

  const state = useMemo<RecipesScreenState>(
    () => ({
      tab: view.tab,
      showToast,
      showScrollTop,
      savePickerOpen,
      saveCategory,
      isSaving,
      hasDiscoveryFilters,
    }),
    [
      view.tab,
      showToast,
      showScrollTop,
      savePickerOpen,
      saveCategory,
      isSaving,
      hasDiscoveryFilters,
    ],
  );

  const filters = useMemo<RecipesScreenFilters>(
    () => ({
      tabs: view.tabs,
      query: view.query,
      setQuery: view.setQuery,
      filtersOpen: view.filtersOpen,
      setFiltersOpen: view.setFiltersOpen,
      filterSections: view.filterSections,
      filterSelection: view.filterSelection,
      activeFilterCount: view.activeFilterCount,
      updateSelection: view.updateSelection,
      clearSelection: view.clearSelection,
    }),
    [
      view.tabs,
      view.query,
      view.setQuery,
      view.filtersOpen,
      view.setFiltersOpen,
      view.filterSections,
      view.filterSelection,
      view.activeFilterCount,
      view.updateSelection,
      view.clearSelection,
    ],
  );

  const data = useMemo<RecipesScreenData>(
    () => ({
      saved,
      discovery,
      visibleSavedItems: view.visibleSavedItems,
      visibleDiscoveryItems,
      savedFilterMode,
      saveTarget,
      isDiscoverySaved,
    }),
    [
      saved,
      discovery,
      view.visibleSavedItems,
      visibleDiscoveryItems,
      savedFilterMode,
      saveTarget,
      isDiscoverySaved,
    ],
  );

  const actions = useMemo<RecipesScreenActions>(
    () => ({
      setTab: view.setTab,
      setSaveCategory,
      setSavePickerOpen,
      handleScrollTop,
      handleSavePress,
      handleSaveConfirm,
      handleDiscoveryScroll,
    }),
    [view.setTab, handleScrollTop, handleSavePress, handleSaveConfirm, handleDiscoveryScroll],
  );

  const toast = useMemo<RecipesScreenToast>(
    () => ({
      state: toastState,
      showToast,
    }),
    [toastState, showToast],
  );

  return useMemo(
    () => ({
      state,
      filters,
      data,
      actions,
      toast,
      discoveryListRef,
    }),
    [state, filters, data, actions, toast],
  );
}
