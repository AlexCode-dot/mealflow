import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/src/shared/ui';
import { useBootstrapRedirect } from '@/src/core/navigation/useBootstrapRedirect';

export default function Index() {
  const target = useBootstrapRedirect();

  if (!target) return <LoadingScreen />;

  return <Redirect href={target} />;
}
