import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AuthScreen, AuthBottomCta } from '@/src/shared/ui';
import { RegisterForm } from '@/src/features/auth/ui/RegisterForm';
import { useRegister } from '@/src/features/auth/hooks/useRegister';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { routes } from '@/src/core/navigation/routes';

export default function RegisterScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const view = useRegister();
  const { state, actions } = view;

  const onSubmit = async (email: string, password: string) => {
    const ok = await actions.register(email, password);
    if (ok) router.replace(routes.overview);
  };

  return (
    <AuthScreen
      variant="register"
      bottomCta={
        <AuthBottomCta
          text="Already have an account?"
          buttonTitle="Log in"
          onPress={() => router.push(routes.login)}
        />
      }
    >
      <View style={styles.formWrap}>
        <RegisterForm
          onSubmit={onSubmit}
          isLoading={state.isLoading}
          error={state.error}
          clearError={actions.clearError}
        />
      </View>
    </AuthScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    formWrap: {
      gap: theme.spacing.s4,
    },
  });
