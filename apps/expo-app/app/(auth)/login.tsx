import { Link, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/src/shared/ui/Screen';
import { LoginForm } from '@/src/features/auth/ui/LoginForm';
import { useLogin } from '@/src/features/auth/hooks/useLogin';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useLogin();

  const onSubmit = async (email: string, password: string) => {
    const ok = await login(email, password);
    if (ok) router.replace('/(app)/home');
  };

  return (
    <Screen>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Login</Text>

        <LoginForm
          onSubmit={onSubmit}
          isLoading={isLoading}
          error={error}
          clearError={clearError}
        />

        <Link href="/(auth)/register">Go to register</Link>
      </View>
    </Screen>
  );
}
