import 'react-native-gesture-handler';
import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { authEvents } from '@/src/core/auth/authEvents';

export default function RootLayout() {
  useEffect(() => {
    return authEvents.subscribe((event) => {
      if (event === 'loggedOut') {
        router.replace('/(auth)/login');
      }
    });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
