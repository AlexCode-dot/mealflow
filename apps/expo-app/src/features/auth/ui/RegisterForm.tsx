import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useState } from 'react';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { TextField, Button, ErrorText } from '@/src/shared/ui';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { validateRegister } from '@/src/features/auth/validation/authValidation';
import { useAuthForm } from '@/src/features/auth/hooks/useAuthForm';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
  error: UiError | null;
  clearError?: () => void;
};

export function RegisterForm({ onSubmit, isLoading, error, clearError }: Props) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const form = useAuthForm({
    validate: validateRegister,
    error,
    isLoading,
    useServerFieldErrors: true,
  });
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [showLegalError, setShowLegalError] = useState(false);

  const legal = Constants.expoConfig?.extra?.legal as
    | { privacyUrl?: string; termsUrl?: string }
    | undefined;

  const submit = () => {
    form.markAllTouched();
    if (!form.canSubmit) return;
    if (!acceptedLegal) {
      setShowLegalError(true);
      return;
    }
    onSubmit(form.email, form.password);
  };

  return (
    <View style={{ gap: 12 }}>
      <TextField
        label={t('auth.email')}
        value={form.email}
        onChangeText={(v) => {
          form.setEmail(v);
          clearError?.();
        }}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onBlur={() => form.markTouched('email')}
        invalid={form.showEmailError}
      />
      {form.showEmailError ? <ErrorText>{form.emailErrorText!}</ErrorText> : null}

      <TextField
        label={t('auth.password')}
        value={form.password}
        onChangeText={(v) => {
          form.setPassword(v);
          clearError?.();
        }}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="done"
        onBlur={() => form.markTouched('password')}
        invalid={form.showPasswordError}
        onSubmitEditing={submit}
      />

      {!form.touched.password ? (
        <Text style={{ fontSize: 12, opacity: 0.6 }}>{t('auth.passwordHint')}</Text>
      ) : null}

      {form.showPasswordError ? <ErrorText>{form.passwordErrorText!}</ErrorText> : null}

      {/* Global server error (only if NOT field-based) */}
      {form.showServerError ? <ErrorText>{form.showServerError.message}</ErrorText> : null}

      <View style={styles.legalBlock}>
        <Pressable
          onPress={() => {
            setAcceptedLegal((prev) => !prev);
            setShowLegalError(false);
          }}
          style={styles.legalRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedLegal }}
        >
          <View style={[styles.checkbox, acceptedLegal ? styles.checkboxChecked : null]}>
            {acceptedLegal ? <View style={styles.checkboxDot} /> : null}
          </View>
          <Text style={styles.legalText}>
            {t('auth.iAgreeTo')}{' '}
            <Text
              style={styles.legalLink}
              onPress={() => (legal?.termsUrl ? Linking.openURL(legal.termsUrl) : undefined)}
            >
              {t('auth.termsOfService')}
            </Text>{' '}
            {t('common.and')}{' '}
            <Text
              style={styles.legalLink}
              onPress={() => (legal?.privacyUrl ? Linking.openURL(legal.privacyUrl) : undefined)}
            >
              {t('auth.privacyPolicy')}
            </Text>
            .
          </Text>
        </Pressable>
        {showLegalError ? <ErrorText>{t('auth.acceptTermsError')}</ErrorText> : null}
      </View>

      <Button
        title={isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
        onPress={submit}
        disabled={!form.canSubmit || !acceptedLegal}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    legalBlock: {
      gap: theme.spacing.s2,
      padding: theme.spacing.s3,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
    },
    legalRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.s2,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      borderColor: theme.colors.primaryDark,
      backgroundColor: theme.colors.primaryLight,
    },
    checkboxDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
      backgroundColor: theme.colors.primaryDark,
    },
    legalText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
      color: theme.colors.textMuted,
      fontWeight: '700',
    },
    legalLink: {
      color: theme.colors.primaryDark,
      fontWeight: '800',
      textDecorationLine: 'underline',
    },
  });
