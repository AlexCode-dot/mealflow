import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { ReactNode } from 'react';
import type { BottomActionBarItem } from '@/src/shared/ui/BottomActionBar';

export type BottomBarMode = 'default' | 'flat-actions' | 'notched-actions';

export type BottomBarCenterAction = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
};

type BottomBarContextValue = {
  mode: BottomBarMode;
  actions: BottomActionBarItem[] | null;
  centerAction: BottomBarCenterAction | null;
  setConfig: (config: {
    mode: BottomBarMode;
    actions: BottomActionBarItem[] | null;
    centerAction: BottomBarCenterAction | null;
  }) => void;
};

const BottomBarContext = createContext<BottomBarContextValue | null>(null);

export function BottomBarProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<BottomBarMode>('default');
  const [actions, setActions] = useState<BottomActionBarItem[] | null>(null);
  const [centerAction, setCenterAction] = useState<BottomBarCenterAction | null>(null);

  const setConfig = useCallback(
    (config: {
      mode: BottomBarMode;
      actions: BottomActionBarItem[] | null;
      centerAction: BottomBarCenterAction | null;
    }) => {
      setMode(config.mode);
      setActions(config.actions && config.actions.length ? config.actions : null);
      setCenterAction(config.centerAction);
    },
    [],
  );

  const value = useMemo(
    () => ({ mode, actions, centerAction, setConfig }),
    [actions, centerAction, mode, setConfig],
  );

  return <BottomBarContext.Provider value={value}>{children}</BottomBarContext.Provider>;
}

export function useBottomBarState() {
  const ctx = useContext(BottomBarContext);
  if (!ctx) {
    throw new Error('useBottomBarState must be used within BottomBarProvider');
  }
  return ctx;
}

export function useBottomBarActions(
  actions: BottomActionBarItem[] | null,
  options?: {
    mode?: BottomBarMode;
    centerAction?: BottomBarCenterAction | null;
  },
) {
  const { setConfig } = useBottomBarState();
  const isFocused = useIsFocused();

  useLayoutEffect(() => {
    if (!isFocused || !actions || actions.length === 0) {
      setConfig({ mode: 'default', actions: null, centerAction: null });
      return () => setConfig({ mode: 'default', actions: null, centerAction: null });
    }

    setConfig({
      mode: options?.mode ?? 'flat-actions',
      actions,
      centerAction: options?.centerAction ?? null,
    });

    return () => setConfig({ mode: 'default', actions: null, centerAction: null });
  }, [actions, isFocused, options?.centerAction, options?.mode, setConfig]);
}
