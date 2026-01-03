import { useRouter } from 'expo-router';
import { Text, View, Button } from 'react-native';
import { tokenStore } from '../../src/core/auth/tokenStore';

export default function HomeScreen() {
  const router = useRouter();

  const logout = () => {
    tokenStore.clearAccessToken();
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Home (authed)</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
