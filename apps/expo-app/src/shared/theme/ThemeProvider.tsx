import { createContext, useContext, useMemo, useState } from 'react';
import { DEFAULT_THEME_NAME, getTheme, type Theme, type ThemeName } from './theme';

type ThemeContextValue = {
  themeName: ThemeName;
  theme: Theme;
  setThemeName: (value: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: React.ReactNode;
  initialThemeName?: ThemeName;
};

export function ThemeProvider({
  children,
  initialThemeName = DEFAULT_THEME_NAME,
}: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(initialThemeName);
  const value = useMemo(
    () => ({
      themeName,
      theme: getTheme(themeName),
      setThemeName,
    }),
    [themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx.theme;
}

export function useThemeController(): Pick<ThemeContextValue, 'themeName' | 'setThemeName'> {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeController must be used within ThemeProvider');
  }
  return { themeName: ctx.themeName, setThemeName: ctx.setThemeName };
}

export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
