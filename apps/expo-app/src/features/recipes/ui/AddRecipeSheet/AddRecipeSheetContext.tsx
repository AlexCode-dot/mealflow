import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AddRecipeSheet } from './AddRecipeSheet';

type AddRecipeSheetContextValue = {
  open: () => void;
  close: () => void;
};

const AddRecipeSheetContext = createContext<AddRecipeSheetContextValue | null>(null);

export function AddRecipeSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <AddRecipeSheetContext.Provider value={value}>
      {children}
      <AddRecipeSheet visible={visible} onClose={close} />
    </AddRecipeSheetContext.Provider>
  );
}

export function useAddRecipeSheet(): AddRecipeSheetContextValue {
  const ctx = useContext(AddRecipeSheetContext);
  if (!ctx) {
    // Fall back to a no-op so the FAB doesn't crash if rendered outside the provider.
    return { open: () => {}, close: () => {} };
  }
  return ctx;
}
