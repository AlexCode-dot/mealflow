export type UiError = {
  kind: 'validation' | 'auth' | 'conflict' | 'network' | 'unknown';
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
};
