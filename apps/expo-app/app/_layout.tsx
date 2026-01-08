import 'react-native-gesture-handler';
import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { authEvents } from '@/src/core/auth/authEvents';
import { routes } from '@/src/core/navigation/routes';

export default function RootLayout() {
  useEffect(() => {
    return authEvents.subscribe((event) => {
      if (event === 'loggedOut') {
        router.replace(routes.login);
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
