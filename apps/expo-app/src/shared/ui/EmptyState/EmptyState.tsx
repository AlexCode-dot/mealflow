import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
      borderRadius: theme.radius.md,
      padding: theme.spacing.s4,
      gap: theme.spacing.s2,
      marginTop: theme.spacing.s3,
    },
    title: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    description: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    action: {
      marginTop: theme.spacing.s1,
    },
  });
