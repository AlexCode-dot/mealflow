import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, ListRow, ModalSheet, Button } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';

export default function SettingsScreen() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <Screen title="Settings">
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.rows}>
          <ListRow
            title="Profile"
            subtitle="View and manage your account"
            onPress={() => router.push(routes.profile)}
          />
          <ListRow
            title="About"
            subtitle="Version and app info"
            onPress={() => setAboutOpen(true)}
          />
        </View>
      </Card>

      <ModalSheet visible={aboutOpen} onClose={() => setAboutOpen(false)}>
        <View style={{ gap: theme.spacing.s3 }}>
          <Text style={styles.sheetTitle}>About</Text>
          <Text style={styles.sheetText}>MealFlow • v0.1</Text>
          <Button title="Close" onPress={() => setAboutOpen(false)} />
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  rows: {
    gap: 10,
  },
  sheetTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sheetText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
