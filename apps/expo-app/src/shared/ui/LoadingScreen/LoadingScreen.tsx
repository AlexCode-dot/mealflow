import { View, Text, StyleSheet } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

export function LoadingScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.s4,
    },
    text: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
  });
