import { Text, StyleSheet } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

export function ErrorText({ children }: { children: string }) {
  return <Text style={styles.text}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
