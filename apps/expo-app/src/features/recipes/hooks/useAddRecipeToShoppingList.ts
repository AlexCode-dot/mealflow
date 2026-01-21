import { useCallback, useState } from 'react';
import type { Recipe } from '@/src/features/recipes/types';
import { shoppingListsApi } from '@/src/features/shopping-lists/api/shoppingListsApi';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { toApiError } from '@/src/core/http/toApiError';

type AddResult =
  | { ok: true }
  | { ok: false; reason: 'no-recipe' | 'no-ingredients' }
  | { ok: false; reason: 'error'; message: string };

const normalizeName = (value: string | null | undefined) => value?.trim() ?? '';

const normalizeUnit = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
};

const matchesItem = (
  name: string,
  unit: string | null,
  itemName: string,
  itemUnit?: string | null,
) =>
  name.toLowerCase() === itemName.trim().toLowerCase() &&
  unit !== null &&
  itemUnit !== null &&
  unit.toLowerCase() === itemUnit.toLowerCase();

export function useAddRecipeToShoppingList() {
  const [isAdding, setIsAdding] = useState(false);

  const addRecipeToShoppingList = useCallback(
    async (recipe: Recipe | null, selectedPortions?: number | null): Promise<AddResult> => {
      if (!recipe) return { ok: false, reason: 'no-recipe' };
      if (!recipe.ingredients?.length) return { ok: false, reason: 'no-ingredients' };

      const recipePortions = recipe.portions ?? null;
      const shouldScale =
        recipePortions && recipePortions > 0 && selectedPortions && selectedPortions > 0;
      const scale = shouldScale ? selectedPortions / recipePortions : 1;

      setIsAdding(true);
      try {
        let list = await shoppingListsApi.create();
        for (const ingredient of recipe.ingredients) {
          const name = normalizeName(ingredient.name);
          if (!name) continue;
          const unit = normalizeUnit(ingredient.unit);
          const quantity =
            ingredient.quantity != null && shouldScale
              ? ingredient.quantity * scale
              : (ingredient.quantity ?? null);

          if (quantity != null && unit) {
            const existing = list.items.find(
              (item) =>
                item.quantity != null &&
                item.unit != null &&
                matchesItem(name, unit, item.name, item.unit),
            );
            if (existing && existing.quantity != null) {
              list = await shoppingListsApi.updateItem(list.id, existing.id, {
                quantity: existing.quantity + quantity,
              });
              continue;
            }
          }

          list = await shoppingListsApi.addItem(list.id, { name, quantity, unit });
        }
        return { ok: true };
      } catch (err) {
        const uiErr = mapCommonError(toApiError(err));
        return { ok: false, reason: 'error', message: uiErr.message };
      } finally {
        setIsAdding(false);
      }
    },
    [],
  );

  return { isAdding, addRecipeToShoppingList };
}
