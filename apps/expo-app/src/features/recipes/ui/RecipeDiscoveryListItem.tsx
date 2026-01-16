import { ShoppingBasket } from 'lucide-react-native';
import { RecipeListCard } from '@/src/features/recipes/ui/RecipeListCard';
import type { InspirationListItem } from '@/src/features/recipes/types';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  item: InspirationListItem;
  onPress?: (id: string) => void;
  onSave?: (item: InspirationListItem) => void;
  saveDisabled?: boolean;
};

export function RecipeDiscoveryListItem({ item, onPress, onSave, saveDisabled }: Props) {
  const subtitle = [item.category, item.area].filter(Boolean).join(' · ');
  const ingredientLabel =
    item.ingredientCount === null || item.ingredientCount === undefined
      ? '–'
      : String(item.ingredientCount);

  return (
    <RecipeListCard
      title={item.title}
      subtitle={subtitle || 'Discover recipe'}
      imageUrl={item.imageUrl ?? undefined}
      onPress={() => onPress?.(item.id)}
      metaLeft={null}
      metaMiddle={{
        icon: <ShoppingBasket color={theme.colors.primaryDark} size={26} strokeWidth={2.4} />,
        label: ingredientLabel,
      }}
      onSave={onSave ? () => onSave(item) : undefined}
      saveDisabled={saveDisabled}
    />
  );
}
