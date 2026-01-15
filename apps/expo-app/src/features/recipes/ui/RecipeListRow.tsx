import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  leading: ReactNode;
  text: string;
  trailing?: ReactNode;
};

export function RecipeListRow({ leading, text, trailing }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.leading}>{leading}</View>
      <Text style={styles.text} numberOfLines={2}>
        {text}
      </Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s3,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
  },
  leading: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.borderGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  trailing: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
