import { View, Text } from 'react-native';
import { Screen } from '@/src/shared/ui/Screen';
import { Button } from '@/src/shared/ui/Button';
import { forceLogout } from '@/src/features/auth/actions/forceLogout';

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Settings</Text>
        <Button title="Logout" onPress={forceLogout} />
      </View>
    </Screen>
  );
}
