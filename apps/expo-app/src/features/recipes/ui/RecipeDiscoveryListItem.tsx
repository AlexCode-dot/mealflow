import { RecipeListCard } from '@/src/features/recipes/ui/RecipeListCard';
import type { DiscoveryRecipe } from '@/src/features/recipes/hooks/useRecipeDiscovery';

type Props = {
  item: DiscoveryRecipe;
  onPress?: (id: string) => void;
};

export function RecipeDiscoveryListItem({ item, onPress }: Props) {
  return (
    <RecipeListCard
      title={item.title}
      timeLabel={item.timeLabel}
      caloriesLabel={item.caloriesLabel}
      likes={item.likes}
      saves={item.saves}
      onPress={() => onPress?.(item.id)}
    />
  );
}
