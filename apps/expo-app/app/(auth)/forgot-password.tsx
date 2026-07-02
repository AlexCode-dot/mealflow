import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthScreen, AuthBottomCta, TextField, Button } from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { useForgotPassword } from '@/src/features/auth/hooks/useForgotPassword';
import { routes } from '@/src/core/navigation/routes';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { isSubmitting, request } = useForgotPassword();
  const [email, setEmail] = useState('');

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const ok = await request(trimmed);
    // Navigate regardless of whether the account exists (no enumeration).
    if (ok) router.replace(routes.resetPassword(trimmed));
  };

  return (
    <AuthScreen
      variant="login"
      bottomCta={
        <AuthBottomCta
          text={t('auth.forgotPasswordTitle')}
          buttonTitle={t('auth.backToLogin')}
          onPress={() => router.replace(routes.login)}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.heading}>{t('auth.forgotPasswordTitle')}</Text>
        <Text style={styles.body}>{t('auth.forgotPasswordBody')}</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        <Button
          title={t('auth.sendResetCode')}
          variant="primary"
          onPress={onSubmit}
          disabled={isSubmitting || email.trim().length === 0}
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
