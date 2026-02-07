import { Text, StyleSheet } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

export function ErrorText({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.text}>{children}</Text>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    text: {
      color: theme.colors.error,
      fontSize: 13,
      fontWeight: '600',
    },
  });
