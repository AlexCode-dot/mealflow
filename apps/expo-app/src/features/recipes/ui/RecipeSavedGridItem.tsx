import { StyleSheet, View } from 'react-native';
import { RecipeGridCard } from '@/src/features/recipes/ui/RecipeGridCard';
import type { RecipeListItem } from '@/src/features/recipes/types';

type Props = {
  item: RecipeListItem;
  onPress: (id: string) => void;
};

export function RecipeSavedGridItem({ item, onPress }: Props) {
  return (
    <View style={styles.item}>
      <RecipeGridCard
        title={item.title}
        cookingTimeMinutes={item.cookingTimeMinutes}
        ingredientCount={item.ingredientCount}
        category={item.category}
        onPress={() => onPress(item.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    maxWidth: '50%',
  },
});
