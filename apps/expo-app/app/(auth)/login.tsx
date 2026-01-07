import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AuthScreen, AuthBottomCta } from '@/src/shared/ui';
import { LoginForm } from '@/src/features/auth/ui/LoginForm';
import { useLogin } from '@/src/features/auth/hooks/useLogin';
import { theme } from '@/src/shared/theme/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useLogin();

  const onSubmit = async (email: string, password: string) => {
    const ok = await login(email, password);
    if (ok) router.replace('/(app)/overview');
  };

  return (
    <AuthScreen
      variant="login"
      bottomCta={
        <AuthBottomCta
          text="New here?"
          buttonTitle="Create account"
          onPress={() => router.push('/(auth)/register')}
        />
      }
    >
      <View style={styles.formWrap}>
        <LoginForm
          onSubmit={onSubmit}
          isLoading={isLoading}
          error={error}
          clearError={clearError}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  formWrap: {
    gap: theme.spacing.s4,
  },
});
