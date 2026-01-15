import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

export type DiscoveryRecipe = {
  id: string;
  title: string;
  timeLabel?: string;
  caloriesLabel?: string;
  likes?: number;
  saves?: number;
};

type UseRecipeDiscoveryResult = {
  items: DiscoveryRecipe[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  refreshControl: ReactElement<RefreshControlProps>;
};

export function useRecipeDiscovery(): UseRecipeDiscoveryResult {
  const [items] = useState<DiscoveryRecipe[]>([
    {
      id: 'discover-1',
      title: 'Vegetarian Tacos',
      timeLabel: '1 hr 10 min',
      caloriesLabel: '196 Cal',
      likes: 12,
      saves: 13,
    },
    {
      id: 'discover-2',
      title: 'Mushroom Risotto',
      timeLabel: '45 min',
      caloriesLabel: '320 Cal',
      likes: 8,
      saves: 6,
    },
    {
      id: 'discover-3',
      title: 'Lemon Herb Salmon',
      timeLabel: '30 min',
      caloriesLabel: '280 Cal',
      likes: 21,
      saves: 14,
    },
  ]);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const load = useCallback(async () => {}, []);

  const refreshControl = useMemo<ReactElement<RefreshControlProps>>(
    () => <RefreshControl refreshing={false} onRefresh={load} />,
    [load],
  );

  return { items, isLoading, error, load, refreshControl };
}
