import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { RecipeAddButton } from '@/src/features/recipes/ui/RecipeAddButton';

type Props = {
  itemsCount: number;
  list: ReactNode;
  empty: ReactNode;
  addLabel: string;
  onAdd: () => void;
  showInlineAdd?: boolean;
};

export function RecipeEditorListSection({
  itemsCount,
  list,
  empty,
  addLabel,
  onAdd,
  showInlineAdd = true,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const showList = itemsCount > 0;

  return (
    <>
      {showList ? (
        <View style={[styles.list, !showInlineAdd ? styles.listWithSticky : null]}>{list}</View>
      ) : (
        empty
      )}
      {showList && showInlineAdd ? <RecipeAddButton label={addLabel} onPress={onAdd} /> : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      gap: theme.spacing.s3,
    },
    listWithSticky: {
      paddingBottom: theme.spacing.s6 + 70,
    },
  });
