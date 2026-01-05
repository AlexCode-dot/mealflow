export type RegisterValidationErrors = {
  email?: string;
  password?: string;
};

export type LoginValidationErrors = {
  email?: string;
  password?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Email is required.';
  if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  const value = password;
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 72) return 'Password must be at most 72 characters.';
  return undefined;
}

export function validateRegister(email: string, password: string): RegisterValidationErrors {
  return {
    email: validateEmail(email),
    password: validatePassword(password),
  };
}

export function validateLogin(email: string, password: string): LoginValidationErrors {
  return {
    email: validateEmail(email),
    password: password ? undefined : 'Password is required.',
  };
}
