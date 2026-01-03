import { Redirect } from 'expo-router';
import { tokenStore } from '@/src/core/auth/tokenStore';

export default function Index() {
  // 1.1: access token lives only in memory, so most launches will go to login.
  const isAuthed = tokenStore.hasAccessToken();

  return <Redirect href={isAuthed ? '/(app)/home' : '/(auth)/login'} />;
}
