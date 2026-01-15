import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { BottomActionBarItem } from '@/src/shared/ui/BottomActionBar';

type BottomBarContextValue = {
  actions: BottomActionBarItem[] | null;
  setActions: (actions: BottomActionBarItem[] | null) => void;
};

const BottomBarContext = createContext<BottomBarContextValue | null>(null);

export function BottomBarProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<BottomActionBarItem[] | null>(null);

  const setActions = useCallback((next: BottomActionBarItem[] | null) => {
    setActionsState(next && next.length ? next : null);
  }, []);

  const value = useMemo(() => ({ actions, setActions }), [actions, setActions]);

  return <BottomBarContext.Provider value={value}>{children}</BottomBarContext.Provider>;
}

export function useBottomBarState() {
  const ctx = useContext(BottomBarContext);
  if (!ctx) {
    throw new Error('useBottomBarState must be used within BottomBarProvider');
  }
  return ctx;
}

export function useBottomBarActions(actions: BottomActionBarItem[] | null) {
  const { setActions } = useBottomBarState();

  useLayoutEffect(() => {
    setActions(actions);
    return () => setActions(null);
  }, [actions, setActions]);
}
