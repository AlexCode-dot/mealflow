import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AuthScreen, AuthBottomCta } from '@/src/shared/ui';
import { LoginForm } from '@/src/features/auth/ui/LoginForm';
import { useLogin } from '@/src/features/auth/hooks/useLogin';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';

export default function LoginScreen() {
  const router = useRouter();
  const view = useLogin();
  const { state, actions } = view;

  const onSubmit = async (email: string, password: string) => {
    const ok = await actions.login(email, password);
    if (ok) router.replace(routes.overview);
  };

  return (
    <AuthScreen
      variant="login"
      bottomCta={
        <AuthBottomCta
          text="New here?"
          buttonTitle="Create account"
          onPress={() => router.push(routes.register)}
        />
      }
    >
      <View style={styles.formWrap}>
        <LoginForm
          onSubmit={onSubmit}
          isLoading={state.isLoading}
          error={state.error}
          clearError={actions.clearError}
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
