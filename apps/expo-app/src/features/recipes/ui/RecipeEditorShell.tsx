import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';
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
  return (
    <View style={styles.panelInner}>
      <RecipeEditorTabs value={tab} onChange={onTabChange} />
      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
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
