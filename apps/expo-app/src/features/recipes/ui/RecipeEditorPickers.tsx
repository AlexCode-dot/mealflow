import { RecipePickerSheet } from '@/src/features/recipes/ui/RecipePickerSheet';
import {
  RECIPE_CATEGORY_OPTIONS,
  RECIPE_PORTIONS_OPTIONS,
  RECIPE_TIME_OPTIONS,
} from '@/src/features/recipes/constants/recipePickerOptions';
import type { RecipePickerKey } from '@/src/features/recipes/hooks/useRecipeEditorState';

type Props = {
  pickerOpen: RecipePickerKey | null;
  time: string;
  portions: string;
  category: string;
  onTimeChange: (value: string) => void;
  onPortionsChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClose: () => void;
};

export function RecipeEditorPickers({
  pickerOpen,
  time,
  portions,
  category,
  onTimeChange,
  onPortionsChange,
  onCategoryChange,
  onClose,
}: Props) {
  return (
    <>
      <RecipePickerSheet
        visible={pickerOpen === 'time'}
        title="Cooking time"
        value={time || '0'}
        options={RECIPE_TIME_OPTIONS}
        onChange={onTimeChange}
        onClose={onClose}
      />

      <RecipePickerSheet
        visible={pickerOpen === 'portions'}
        title="Portions"
        value={portions || '0'}
        options={RECIPE_PORTIONS_OPTIONS}
        onChange={onPortionsChange}
        onClose={onClose}
      />

      <RecipePickerSheet
        visible={pickerOpen === 'category'}
        title="Category"
        value={category}
        options={RECIPE_CATEGORY_OPTIONS}
        onChange={onCategoryChange}
        onClose={onClose}
      />
    </>
  );
}
