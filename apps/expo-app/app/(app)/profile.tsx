import { Text, View, StyleSheet } from 'react-native';
import { Screen, Button } from '@/src/shared/ui';
import { forceLogout } from '@/src/features/auth/actions/forceLogout';
import { theme } from '@/src/shared/theme/theme';

export default function ProfileScreen() {
  return (
    <Screen title="Profile" showBack scroll showProfileIcon={false}>
      <View style={styles.root}>
        <Text style={styles.text}>Profile (placeholder)</Text>

        <Button title="Logout" variant="danger" onPress={forceLogout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing.s4,
  },
  text: {
    fontSize: 16,
    color: theme.colors.text,
  },
});
