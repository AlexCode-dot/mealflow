import { useCallback, useMemo, useState } from 'react';
import type { RecipeListItem } from '@/src/features/recipes/types';
import {
  buildDiscoveryFilters,
  buildSavedFilters,
} from '@/src/features/recipes/constants/recipeFilters';
import { useTheme } from '@/src/shared/theme';

const TABS = [
  { key: 'saved', label: 'Saved recipes' },
  { key: 'inspiration', label: 'Find new recipes' },
] as const;

export type RecipeListTabKey = (typeof TABS)[number]['key'];

type Args = {
  savedItems: RecipeListItem[];
};

export function useRecipeListView({ savedItems }: Args) {
  const theme = useTheme();
  const [tab, setTab] = useState<RecipeListTabKey>('saved');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<Record<string, string[]>>({});
  const [discoveryFilters, setDiscoveryFilters] = useState<Record<string, string[]>>({});

  const filterSections = useMemo(
    () => (tab === 'saved' ? buildSavedFilters(theme) : buildDiscoveryFilters(theme)),
    [tab, theme],
  );
  const filterSelection = tab === 'saved' ? savedFilters : discoveryFilters;
  const activeFilterCount = Object.values(filterSelection).reduce(
    (acc, values) => acc + values.length,
    0,
  );

  const visibleSavedItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = savedItems;

    if (q) {
      filtered = filtered.filter((r) => {
        const text = `${r.title} ${r.description ?? ''}`.toLowerCase();
        return text.includes(q);
      });
    }

    const categoryKeys = savedFilters.category ?? [];
    if (categoryKeys.length) {
      filtered = filtered.filter((r) => {
        const category = (r.category ?? '').trim().toLowerCase();
        return categoryKeys.includes(category);
      });
    }

    const ingredientTags = (savedFilters.ingredients ?? []).map((tag) => tag.toLowerCase());
    if (ingredientTags.length) {
      filtered = filtered.filter((r) => {
        const names = (r.ingredientNames ?? []).map((name) => name.toLowerCase());
        if (!names.length) return false;
        return ingredientTags.every((tag) => names.some((name) => name.includes(tag)));
      });
    }

    const timeFilter = savedFilters.time?.[0];
    if (timeFilter && timeFilter !== '0') {
      const targetMinutes = Number(timeFilter);
      if (Number.isFinite(targetMinutes)) {
        filtered = filtered.filter((r) => r.cookingTimeMinutes === targetMinutes);
      }
    }

    const portionsFilter = savedFilters.portions?.[0];
    if (portionsFilter && portionsFilter !== '0') {
      const targetPortions = Number(portionsFilter);
      if (Number.isFinite(targetPortions)) {
        filtered = filtered.filter((r) => r.portions === targetPortions);
      }
    }

    return filtered;
  }, [savedItems, query, savedFilters]);

  const updateSelection = useCallback(
    (sectionKey: string, next: string[]) => {
      if (tab === 'saved') {
        setSavedFilters((prev) => ({ ...prev, [sectionKey]: next }));
      } else {
        setDiscoveryFilters((prev) => ({ ...prev, [sectionKey]: next }));
      }
    },
    [tab],
  );

  const clearSelection = useCallback(() => {
    if (tab === 'saved') {
      setSavedFilters({});
    } else {
      setDiscoveryFilters({});
    }
  }, [tab]);

  return {
    tabs: TABS,
    tab,
    setTab,
    query,
    setQuery,
    filtersOpen,
    setFiltersOpen,
    filterSections,
    filterSelection,
    activeFilterCount,
    visibleSavedItems,
    updateSelection,
    clearSelection,
    discoveryFilters,
  };
}
