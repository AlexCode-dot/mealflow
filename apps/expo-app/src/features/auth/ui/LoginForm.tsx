import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField, Button, ErrorText } from '@/src/shared/ui';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { validateLogin } from '@/src/features/auth/validation/authValidation';
import { useAuthForm } from '@/src/features/auth/hooks/useAuthForm';

type Props = {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
  error: UiError | null;
  clearError?: () => void;
};

export function LoginForm({ onSubmit, isLoading, error, clearError }: Props) {
  const { t } = useTranslation();
  const form = useAuthForm({ validate: validateLogin, error, isLoading });

  const submit = () => {
    form.markAllTouched();
    if (!form.canSubmit) return;
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
      {form.showEmailError ? <ErrorText>{form.clientErrors.email!}</ErrorText> : null}

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

      {form.showPasswordError ? <ErrorText>{form.clientErrors.password!}</ErrorText> : null}
      {form.showServerError ? <ErrorText>{form.showServerError.message}</ErrorText> : null}

      <Button
        title={isLoading ? t('auth.loggingIn') : t('auth.login')}
        onPress={submit}
        disabled={!form.canSubmit}
      />
    </View>
  );
}
