import { useTranslation } from 'react-i18next';
import { RecipePickerSheet } from '@/src/features/recipes/ui/RecipePickerSheet';
import {
  getRecipeCategoryOptions,
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
  const { t } = useTranslation();
  return (
    <>
      <RecipePickerSheet
        visible={pickerOpen === 'time'}
        title={t('recipes.cookingTimeLabel')}
        value={time || '0'}
        options={RECIPE_TIME_OPTIONS}
        onChange={onTimeChange}
        onClose={onClose}
      />

      <RecipePickerSheet
        visible={pickerOpen === 'portions'}
        title={t('recipes.portions')}
        value={portions || '0'}
        options={RECIPE_PORTIONS_OPTIONS}
        onChange={onPortionsChange}
        onClose={onClose}
      />

      <RecipePickerSheet
        visible={pickerOpen === 'category'}
        title={t('recipes.categoryLabel')}
        value={category}
        options={getRecipeCategoryOptions(t)}
        onChange={onCategoryChange}
        onClose={onClose}
      />
    </>
  );
}
