export type UiError = {
  kind: 'validation' | 'auth' | 'conflict' | 'network' | 'rate_limit' | 'unknown';
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
  retryAfterSeconds?: number;
};
