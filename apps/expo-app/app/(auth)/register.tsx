import { Link, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/src/shared/ui/Screen';
import { RegisterForm } from '@/src/features/auth/ui/RegisterForm';
import { useRegister } from '@/src/features/auth/hooks/useRegister';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useRegister();

  const onSubmit = async (email: string, password: string) => {
    const ok = await register(email, password);
    if (ok) router.replace('/(app)/home');
  };

  return (
    <Screen>
      <View style={{ gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Register</Text>

        <RegisterForm
          onSubmit={onSubmit}
          isLoading={isLoading}
          error={error}
          clearError={clearError}
        />

        <Link href="/(auth)/login">Back to login</Link>
      </View>
    </Screen>
  );
}
