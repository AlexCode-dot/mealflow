import { ShoppingBasket } from 'lucide-react-native';
import { RecipeListCard } from '@/src/features/recipes/ui/RecipeListCard';
import type { InspirationListItem } from '@/src/features/recipes/types';
import { useTheme } from '@/src/shared/theme';

type Props = {
  item: InspirationListItem;
  onPress?: (id: string) => void;
  onSave?: (item: InspirationListItem) => void;
  isSaved?: boolean;
  saveDisabled?: boolean;
};

export function RecipeDiscoveryListItem({
  item,
  onPress,
  onSave,
  isSaved = false,
  saveDisabled,
}: Props) {
  const theme = useTheme();
  const subtitle = [item.category, item.area].filter(Boolean).join(' · ');
  const ingredientLabel =
    item.ingredientCount !== null && item.ingredientCount !== undefined && item.ingredientCount > 0
      ? String(item.ingredientCount)
      : null;

  return (
    <RecipeListCard
      title={item.title}
      subtitle={subtitle || 'Discover recipe'}
      imageUrl={item.imageUrl ?? undefined}
      onPress={() => onPress?.(item.id)}
      metaLeft={null}
      metaMiddle={
        ingredientLabel
          ? {
              icon: <ShoppingBasket color={theme.colors.primaryDark} size={26} strokeWidth={2.4} />,
              label: ingredientLabel,
            }
          : null
      }
      onSave={!isSaved && onSave ? () => onSave(item) : undefined}
      saveLabel={isSaved ? 'Saved' : 'Save'}
      saveFilled={isSaved}
      savedBadge={isSaved}
      saveDisabled={saveDisabled || isSaved}
    />
  );
}
