import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import {
  RecipeEditorTabs,
  type RecipeEditorTabKey,
} from '@/src/features/recipes/ui/RecipeEditorTabs';

type Props = {
  tab: RecipeEditorTabKey;
  onTabChange: (tab: RecipeEditorTabKey) => void;
  children: ReactNode;
};

export function RecipeEditorShell({ tab, onTabChange, children }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.panelInner}>
      <RecipeEditorTabs value={tab} onChange={onTabChange} />
      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    panelInner: {
      paddingTop: theme.spacing.s4,
    },
    panelContent: {
      paddingHorizontal: theme.spacing.s4,
      paddingTop: theme.spacing.s5,
      paddingBottom: theme.spacing.s4,
      gap: theme.spacing.s3,
    },
  });
