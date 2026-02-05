import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const environment =
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? (__DEV__ ? 'development' : 'production');
const release = process.env.EXPO_PUBLIC_SENTRY_RELEASE ?? Constants.expoConfig?.version;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    enableAutoSessionTracking: true,
    enableNative: !__DEV__,
    tracesSampleRate: 0,
  });
}
