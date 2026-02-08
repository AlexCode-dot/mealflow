import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { authEvents } from '@/src/core/auth/authEvents';
import { routes } from '@/src/core/navigation/routes';
import { GlobalToastHost, GlobalToastProvider } from '@/src/shared/ui';
import { WebFrame } from '@/src/shared/ui/WebFrame';
import { ThemeProvider } from '@/src/shared/theme';
import { ThemeBootstrap } from '@/src/core/theme/ThemeBootstrap';
import '@/src/core/monitoring/sentry';

export default function RootLayout() {
  useEffect(() => {
    return authEvents.subscribe((event) => {
      if (event === 'loggedOut') {
        router.replace(routes.login);
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <GlobalToastProvider>
        <ThemeProvider>
          <ThemeBootstrap />
          <WebFrame>
            <GlobalToastHost />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </WebFrame>
        </ThemeProvider>
      </GlobalToastProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
