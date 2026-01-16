import { RecipeListCard } from '@/src/features/recipes/ui/RecipeListCard';
import type { InspirationListItem } from '@/src/features/recipes/types';

type Props = {
  item: InspirationListItem;
  onPress?: (id: string) => void;
};

export function RecipeDiscoveryListItem({ item, onPress }: Props) {
  const subtitle = [item.category, item.area].filter(Boolean).join(' · ');

  return (
    <RecipeListCard
      title={item.title}
      subtitle={subtitle || 'Discover recipe'}
      imageUrl={item.imageUrl ?? undefined}
      onPress={() => onPress?.(item.id)}
    />
  );
}
