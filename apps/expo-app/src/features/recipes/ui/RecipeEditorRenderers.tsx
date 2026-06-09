import { Pressable } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import type { IngredientDto } from '@/src/features/recipes/types';
import type { StepItem } from '@/src/features/recipes/hooks/useStepReorderState';
import { RecipeIngredientRow } from '@/src/features/recipes/ui/RecipeIngredientRow';
import { RecipeStepRow } from '@/src/features/recipes/ui/RecipeStepRow';

type Args = {
  onEditIngredient: (index: number) => void;
  onEditStep: (index: number) => void;
};

export function createRecipeEditorRenderers({ onEditIngredient, onEditStep }: Args) {
  const renderIngredientItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<IngredientDto>) => {
    const currentIndex = getIndex?.() ?? 0;

    return (
      <Pressable onPress={() => onEditIngredient(currentIndex)} disabled={isActive}>
        <RecipeIngredientRow
          name={item.name}
          quantity={item.quantity}
          unit={item.unit}
          estimated={item.estimated}
          onDrag={drag}
        />
      </Pressable>
    );
  };

  const renderStepItem = ({ item, drag, isActive, getIndex }: RenderItemParams<StepItem>) => {
    const currentIndex = getIndex?.() ?? 0;
    const displayIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;

    return (
      <Pressable onPress={() => onEditStep(currentIndex)} disabled={isActive}>
        <RecipeStepRow index={displayIndex} text={item.text} onDrag={drag} />
      </Pressable>
    );
  };

  return { renderIngredientItem, renderStepItem };
}
