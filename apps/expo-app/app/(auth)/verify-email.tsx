import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthScreen, AuthBottomCta } from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { VerifyEmailForm } from '@/src/features/auth/ui/VerifyEmailForm';
import { useVerifyEmail } from '@/src/features/auth/hooks/useVerifyEmail';
import { routes } from '@/src/core/navigation/routes';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [code, setCode] = useState('');
  const view = useVerifyEmail(email);

  const onSubmit = async () => {
    const ok = await view.actions.submit(code);
    if (ok) router.replace(routes.overview);
  };

  return (
    <AuthScreen
      variant="register"
      bottomCta={
        <AuthBottomCta
          text={t('auth.alreadyVerified')}
          buttonTitle={t('auth.login')}
          onPress={() => router.replace(routes.login)}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.heading}>{t('auth.verifyEmailTitle')}</Text>
        <Text style={styles.body}>{t('auth.verifyEmailBody')}</Text>
      </View>

      <VerifyEmailForm
        email={email}
        code={code}
        onCodeChange={setCode}
        onSubmit={onSubmit}
        onResend={view.actions.resend}
        onChangeEmail={() => router.replace(routes.register)}
        isSubmitting={view.state.isSubmitting}
        isResending={view.state.isResending}
        resendCooldown={view.state.resendCooldown}
        error={view.state.error}
      />
    </AuthScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    intro: {
      gap: 6,
      marginBottom: theme.spacing.s4,
      alignItems: 'center',
    },
    heading: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '900',
    },
    body: {
      color: theme.colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
  });
