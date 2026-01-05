import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/src/shared/ui/Button';
import { httpClient } from '@/src/core/http/httpClient';
import { forceLogout } from '@/src/features/auth/actions/forceLogout';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';

type MeResponse = { userId: string };

export default function HomeScreen() {
  const [me, setMe] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    setError(null);

    try {
      const res = await httpClient.appApi.get<MeResponse>('/api/me');
      setMe(`userId: ${res.userId}`);
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr.message);
      setMe("Couldn't load your profile.");
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Home</Text>

      {error ? <Text style={{ color: '#b00020' }}>{error}</Text> : null}
      <Text>{me}</Text>

      <Button title="Logout" onPress={forceLogout} />
    </View>
  );
}
