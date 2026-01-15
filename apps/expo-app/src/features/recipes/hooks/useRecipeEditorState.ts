import { useState } from 'react';
import type { RecipeEditorTabKey } from '@/src/features/recipes/ui';

export type RecipePickerKey = 'time' | 'portions' | 'category';

export function useRecipeEditorUiState() {
  const [tab, setTab] = useState<RecipeEditorTabKey>('basic');
  const [pickerOpen, setPickerOpen] = useState<RecipePickerKey | null>(null);

  return {
    tab,
    setTab,
    pickerOpen,
    setPickerOpen,
  };
}
