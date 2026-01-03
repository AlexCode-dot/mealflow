import { Link, useRouter } from 'expo-router';
import { Text, View, Button } from 'react-native';
import { tokenStore } from '@/src/core/auth/tokenStore';

export default function LoginScreen() {
  const router = useRouter();

  // TEMP: lets you verify navigation before wiring real login
  const fakeLogin = () => {
    tokenStore.setAccessToken('dev-access-token');
    router.replace('/(app)/home');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Login</Text>

      <Button title="Temporary fake login" onPress={fakeLogin} />

      <Link href="/(auth)/register">Go to register</Link>
    </View>
  );
}
