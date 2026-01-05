import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '@/src/shared/ui/Button';
import { tokenStore } from '@/src/core/auth/tokenStore';
import { httpClient, HttpError } from '@/src/core/http/httpClient';

export default function HomeScreen() {
  const router = useRouter();
  const [me, setMe] = useState<string>('Loading...');

  const forceLogout = async () => {
    tokenStore.clearAccessToken();
    await tokenStore.clearRefreshToken();
    router.replace('/(auth)/login');
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await httpClient.appApi.get<{ userId: string }>('/api/me');
        setMe(`userId: ${res.userId}`);
      } catch (e) {
        // Minimal 401 handling (prep for 1.2)
        if (e instanceof HttpError && e.status === 401) {
          await forceLogout();
          return;
        }
        setMe('Failed to call /api/me (check token / services)');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Home (authed)</Text>
      <Text>{me}</Text>
      <Button title="Logout" onPress={forceLogout} />
    </View>
  );
}
