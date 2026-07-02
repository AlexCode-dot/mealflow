import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthScreen, AuthBottomCta, TextField, Button, OtpInput, ErrorText, useGlobalToast } from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { useResetPassword } from '@/src/features/auth/hooks/useResetPassword';
import { routes } from '@/src/core/navigation/routes';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { show } = useGlobalToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const { state, actions } = useResetPassword(email);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const canSubmit = code.length === 6 && newPassword.length >= 8 && !state.isSubmitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    const ok = await actions.submit(code, newPassword);
    if (ok) {
      show({ variant: 'success', message: t('auth.resetPasswordSuccess') });
      router.replace(routes.login);
    }
  };

  return (
    <AuthScreen
      variant="register"
      bottomCta={
        <AuthBottomCta
          text={t('auth.forgotPasswordTitle')}
          buttonTitle={t('auth.backToLogin')}
          onPress={() => router.replace(routes.login)}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.heading}>{t('auth.resetPasswordTitle')}</Text>
        <Text style={styles.body}>{t('auth.resetPasswordBody')}</Text>
      </View>

      <View style={styles.form}>
        <OtpInput
          value={code}
          onChangeText={(v) => {
            setCode(v);
            actions.clearError();
          }}
          invalid={Boolean(state.error)}
        />
        <TextField
          label={t('auth.newPassword')}
          value={newPassword}
          onChangeText={(v) => {
            setNewPassword(v);
            actions.clearError();
          }}
          placeholder={t('auth.newPasswordPlaceholder')}
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        {state.error ? <ErrorText>{state.error.message}</ErrorText> : null}
        <Button
          title={t('auth.resetPasswordCta')}
          variant="primary"
          onPress={onSubmit}
          disabled={!canSubmit}
        />
      </View>
    </AuthScreen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    intro: {
      gap: theme.spacing.s2,
      marginBottom: theme.spacing.s4,
    },
    heading: {
      fontSize: 24,
      fontWeight: '900',
      color: theme.colors.text,
    },
    body: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    form: {
      gap: theme.spacing.s3,
    },
  });
