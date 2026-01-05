const identity = process.env.EXPO_PUBLIC_IDENTITY_BASE_URL;
const appApi = process.env.EXPO_PUBLIC_APP_API_BASE_URL;

if (!identity || !appApi) {
  throw new Error(
    'Missing EXPO_PUBLIC_* env vars. Check apps/expo-app/.env.local (and .env.example).',
  );
}

export const ENV = {
  IDENTITY_BASE_URL: identity.replace(/\/$/, ''),
  APP_API_BASE_URL: appApi.replace(/\/$/, ''),
};
