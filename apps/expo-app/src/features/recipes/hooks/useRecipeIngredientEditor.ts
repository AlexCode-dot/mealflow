import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IngredientDto } from '@/src/features/recipes/types';
import {
  validateIngredientDraft,
  type IngredientFieldErrors,
} from '@/src/features/recipes/validation/recipeValidation';

type Draft = {
  name: string;
  unit: string;
  amount: string;
};

type Args = {
  ingredients: IngredientDto[];
  setIngredients: (next: IngredientDto[]) => void;
};

const createIngredientId = () => `ing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ensureIngredientIds = (items: IngredientDto[]) =>
  items.map((item) => (item.id ? item : { ...item, id: createIngredientId() }));

export function useRecipeIngredientEditor({ ingredients, setIngredients }: Args) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ name: '', unit: '', amount: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<IngredientFieldErrors>({});

  const ingredientsWithIds = useMemo(() => ensureIngredientIds(ingredients), [ingredients]);

  useEffect(() => {
    if (ingredients.some((item) => !item.id)) {
      setIngredients(ingredientsWithIds);
    }
  }, [ingredients, ingredientsWithIds, setIngredients]);

  const openAdd = useCallback(() => {
    setDraft({ name: '', unit: '', amount: '' });
    setEditingIndex(null);
    setErrors({});
    setIsOpen(true);
  }, []);

  const openEdit = useCallback(
    (index: number) => {
      const current = ingredientsWithIds[index];
      setDraft({
        name: current?.name ?? '',
        unit: current?.unit ?? '',
        amount: current?.quantity ? String(current.quantity) : '',
      });
      setEditingIndex(index);
      setErrors({});
      setIsOpen(true);
    },
    [ingredientsWithIds],
  );

  const setName = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, name: value }));
    setErrors((prev) => ({ ...prev, name: undefined }));
  }, []);

  const setUnit = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, unit: value }));
    setErrors((prev) => ({ ...prev, unit: undefined }));
  }, []);

  const setAmount = useCallback((value: string) => {
    setDraft((prev) => ({ ...prev, amount: value }));
    setErrors((prev) => ({ ...prev, amount: undefined }));
  }, []);

  const save = useCallback(() => {
    const validation = validateIngredientDraft(draft.name, draft.unit, draft.amount);
    if (validation.name || validation.unit || validation.amount) {
      setErrors(validation);
      return;
    }

    const name = draft.name.trim();
    const quantity = draft.amount ? Number(draft.amount) : undefined;
    const next: IngredientDto = {
      id: editingIndex === null ? createIngredientId() : ingredientsWithIds[editingIndex]?.id,
      name,
      unit: draft.unit ? draft.unit : undefined,
      quantity: Number.isNaN(quantity) ? undefined : quantity,
    };
    if (editingIndex === null) {
      setIngredients([...ingredientsWithIds, next]);
    } else {
      const updated = [...ingredientsWithIds];
      updated[editingIndex] = next;
      setIngredients(updated);
    }
    setErrors({});
    setIsOpen(false);
  }, [draft, editingIndex, ingredientsWithIds, setIngredients]);

  const remove = useCallback(() => {
    if (editingIndex === null) return;
    setIngredients(ingredientsWithIds.filter((_, idx) => idx !== editingIndex));
    setIsOpen(false);
  }, [editingIndex, ingredientsWithIds, setIngredients]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    draft,
    setDraft,
    setName,
    setUnit,
    setAmount,
    errors,
    editingIndex,
    openAdd,
    openEdit,
    save,
    remove,
    close,
  };
}
