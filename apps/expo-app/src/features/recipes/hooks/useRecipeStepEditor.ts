import { useCallback, useState } from 'react';
import { validateStepText } from '@/src/features/recipes/validation/recipeValidation';

type Args = {
  steps: string[];
  setSteps: (next: string[]) => void;
};

export function useRecipeStepEditor({ steps, setSteps }: Args) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openAdd = useCallback(() => {
    setDraft('');
    setEditingIndex(null);
    setError(null);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback(
    (index: number) => {
      setDraft(steps[index] ?? '');
      setEditingIndex(index);
      setError(null);
      setIsOpen(true);
    },
    [steps],
  );

  const setDescription = useCallback((value: string) => {
    setDraft(value);
    setError(null);
  }, []);

  const save = useCallback(() => {
    const validation = validateStepText(draft);
    if (validation) {
      setError(validation);
      return;
    }
    const next = draft.trim();
    if (editingIndex === null) {
      setSteps([...steps, next]);
    } else {
      const updated = [...steps];
      updated[editingIndex] = next;
      setSteps(updated);
    }
    setError(null);
    setIsOpen(false);
  }, [draft, editingIndex, setSteps, steps]);

  const remove = useCallback(() => {
    if (editingIndex === null) return;
    setSteps(steps.filter((_, idx) => idx !== editingIndex));
    setIsOpen(false);
  }, [editingIndex, setSteps, steps]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    draft,
    setDraft,
    setDescription,
    error,
    editingIndex,
    openAdd,
    openEdit,
    save,
    remove,
    close,
  };
}
