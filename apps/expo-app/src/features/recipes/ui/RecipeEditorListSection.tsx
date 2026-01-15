import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';
import { RecipeAddButton } from '@/src/features/recipes/ui/RecipeAddButton';

type Props = {
  itemsCount: number;
  list: ReactNode;
  empty: ReactNode;
  addLabel: string;
  onAdd: () => void;
};

export function RecipeEditorListSection({ itemsCount, list, empty, addLabel, onAdd }: Props) {
  return (
    <>
      {itemsCount ? <View style={styles.list}>{list}</View> : empty}
      {itemsCount ? <RecipeAddButton label={addLabel} onPress={onAdd} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.s3,
  },
});
