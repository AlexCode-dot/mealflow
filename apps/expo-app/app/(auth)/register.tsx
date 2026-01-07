import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AuthScreen, AuthBottomCta } from '@/src/shared/ui';
import { RegisterForm } from '@/src/features/auth/ui/RegisterForm';
import { useRegister } from '@/src/features/auth/hooks/useRegister';
import { theme } from '@/src/shared/theme/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useRegister();

  const onSubmit = async (email: string, password: string) => {
    const ok = await register(email, password);
    if (ok) router.replace('/(app)/overview');
  };

  return (
    <AuthScreen
      variant="register"
      bottomCta={
        <AuthBottomCta
          text="Already have an account?"
          buttonTitle="Log in"
          onPress={() => router.push('/(auth)/login')}
        />
      }
    >
      <View style={styles.formWrap}>
        <RegisterForm
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
