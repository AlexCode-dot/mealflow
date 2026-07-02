import { useRouter } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AuthScreen, AuthBottomCta } from '@/src/shared/ui';
import { LoginForm } from '@/src/features/auth/ui/LoginForm';
import { useLogin } from '@/src/features/auth/hooks/useLogin';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { routes } from '@/src/core/navigation/routes';

export default function LoginScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const view = useLogin();
  const { state, actions } = view;

  const onSubmit = async (email: string, password: string) => {
    const outcome = await actions.login(email, password);
    if (outcome.kind === 'success') {
      router.replace(routes.overview);
    } else if (outcome.kind === 'verification-required') {
      router.replace(routes.verifyEmail(outcome.email));
    }
  };

  return (
    <AuthScreen
      variant="login"
      bottomCta={
        <AuthBottomCta
          text={t('auth.newHere')}
          buttonTitle={t('auth.createAccount')}
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
        <Pressable onPress={() => router.push(routes.forgotPassword)} hitSlop={8}>
          <Text style={styles.forgotLink}>{t('auth.forgotPasswordLink')}</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    formWrap: {
      gap: theme.spacing.s4,
    },
    forgotLink: {
      alignSelf: 'center',
      color: theme.colors.primaryDark,
      fontSize: 14,
      fontWeight: '700',
    },
  });
