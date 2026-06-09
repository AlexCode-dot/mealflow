import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, ErrorText, OtpInput } from '@/src/shared/ui';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  email: string;
  code: string;
  onCodeChange: (v: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
  isSubmitting: boolean;
  isResending: boolean;
  /** Seconds until the resend button becomes available again. 0 = ready. */
  resendCooldown: number;
  error: UiError | null;
};

export function VerifyEmailForm({
  email,
  code,
  onCodeChange,
  onSubmit,
  onResend,
  onChangeEmail,
  isSubmitting,
  isResending,
  resendCooldown,
  error,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const canSubmit = code.length === 6 && !isSubmitting;
  const canResend = !isResending && resendCooldown <= 0;

  const resendLabel = useMemo(() => {
    if (isResending) return t('auth.sendingCode');
    if (resendCooldown > 0) return t('auth.resendIn', { seconds: resendCooldown });
    return t('auth.resendCode');
  }, [isResending, resendCooldown, t]);

  return (
    <View style={styles.root}>
      {/* Email summary */}
      <View style={styles.emailBlock}>
        <Text style={styles.emailCaption}>{t('auth.sentTo')}</Text>
        <Text style={styles.emailValue} numberOfLines={1} ellipsizeMode="middle">
          {email}
        </Text>
        <Pressable onPress={onChangeEmail} hitSlop={8}>
          <Text style={styles.changeLink}>{t('auth.useADifferentEmail')}</Text>
        </Pressable>
      </View>

      {/* Code input */}
      <View style={styles.codeBlock}>
        <OtpInput
          value={code}
          onChangeText={onCodeChange}
          invalid={Boolean(error)}
          onSubmit={canSubmit ? onSubmit : undefined}
        />
        {error ? (
          <View style={styles.errorWrap}>
            <ErrorText>{error.message}</ErrorText>
          </View>
        ) : null}
      </View>

      <Button
        title={isSubmitting ? t('auth.verifying') : t('auth.verify')}
        variant="primary"
        onPress={onSubmit}
        disabled={!canSubmit}
      />

      <Pressable onPress={onResend} disabled={!canResend} hitSlop={8} style={styles.resendRow}>
        <Text style={[styles.resendText, !canResend ? styles.resendDisabled : null]}>
          {resendLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      gap: theme.spacing.s4,
    },
    emailBlock: {
      alignItems: 'center',
      gap: 4,
    },
    emailCaption: {
      color: theme.colors.textMuted,
      fontSize: 12,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    emailValue: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '700',
      maxWidth: '100%',
    },
    changeLink: {
      color: theme.colors.primaryDark,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 2,
    },
    codeBlock: {
      gap: theme.spacing.s2,
    },
    errorWrap: {
      paddingTop: theme.spacing.s1,
    },
    resendRow: {
      alignItems: 'center',
      paddingVertical: theme.spacing.s2,
    },
    resendText: {
      color: theme.colors.primaryDark,
      fontSize: 14,
      fontWeight: '700',
    },
    resendDisabled: {
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
  });
