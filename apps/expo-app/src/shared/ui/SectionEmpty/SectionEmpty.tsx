import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
};

export function SectionEmpty({ title, description, actionLabel, onAction, actionIcon }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Pressable style={styles.button} onPress={onAction}>
        {actionIcon ? <View style={styles.icon}>{actionIcon}</View> : null}
        <Text style={styles.buttonLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      alignItems: 'center',
      gap: theme.spacing.s2,
      paddingVertical: theme.spacing.s4,
    },
    title: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: '700',
    },
    description: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    button: {
      marginTop: theme.spacing.s3,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: theme.radius.pill,
      borderWidth: 2,
      borderColor: theme.colors.primaryDark,
    },
    buttonLabel: {
      color: theme.colors.primaryDark,
      fontSize: 15,
      fontWeight: '700',
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
