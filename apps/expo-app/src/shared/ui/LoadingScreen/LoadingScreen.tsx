import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

export function LoadingScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
