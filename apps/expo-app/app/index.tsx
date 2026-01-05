import { Redirect } from 'expo-router';
import { tokenStore } from '@/src/core/auth/tokenStore';

export default function Index() {
  const isAuthed = tokenStore.hasAccessToken();

  return <Redirect href={isAuthed ? '/(app)/home' : '/(auth)/login'} />;
}
