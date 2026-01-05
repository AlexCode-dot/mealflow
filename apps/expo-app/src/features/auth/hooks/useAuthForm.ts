import { useMemo, useState } from 'react';
import type { UiError } from '@/src/shared/errors/errorTypes';

export type AuthTouched = {
  email: boolean;
  password: boolean;
};

export type AuthValidation = {
  email?: string;
  password?: string;
};

type Params = {
  validate: (email: string, password: string) => AuthValidation;
  error: UiError | null;
  isLoading: boolean;

  /**
   * If true, we will show backend fieldErrors inline (email/password)
   * and only show a global error if it's not field-based.
   *
   * For Register (409 email exists, 400 field errors, etc).
   * For Login, keep false (or omit) so server errors show globally.
   */
  useServerFieldErrors?: boolean;
};

export function useAuthForm({ validate, error, isLoading, useServerFieldErrors = false }: Params) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<AuthTouched>({
    email: false,
    password: false,
  });

  const clientErrors = useMemo(() => validate(email, password), [email, password, validate]);

  const serverFieldErrors = useServerFieldErrors ? error?.fieldErrors : undefined;
  const serverEmailError = serverFieldErrors?.email;
  const serverPasswordError = serverFieldErrors?.password;

  const emailErrorText = useServerFieldErrors
    ? clientErrors.email || serverEmailError || undefined
    : clientErrors.email;

  const passwordErrorText = useServerFieldErrors
    ? clientErrors.password || serverPasswordError || undefined
    : clientErrors.password;

  const showEmailError = touched.email && Boolean(emailErrorText);
  const showPasswordError = touched.password && Boolean(passwordErrorText);

  const canSubmit =
    !isLoading &&
    !clientErrors.email &&
    !clientErrors.password &&
    email.trim().length > 0 &&
    password.length > 0;

  // Error rules I need to remember:
  // - Always hide server errors while client validation is failing (UX: fix your inputs first)
  // - For register (useServerFieldErrors): only show global error if it’s NOT field-based
  // - For login: show the error globally when client validation passes
  const showServerError = (() => {
    if (clientErrors.email || clientErrors.password) return null;
    if (!error) return null;

    if (!useServerFieldErrors) return error;

    // register: don't show global error if it's field-based
    if (serverEmailError || serverPasswordError) return null;

    return error;
  })();

  const markTouched = (field: keyof AuthTouched) => setTouched((t) => ({ ...t, [field]: true }));

  const markAllTouched = () => setTouched({ email: true, password: true });

  return {
    email,
    password,
    setEmail,
    setPassword,
    touched,
    markTouched,
    markAllTouched,
    clientErrors,
    emailErrorText,
    passwordErrorText,
    showEmailError,
    showPasswordError,
    canSubmit,
    showServerError,
  };
}
