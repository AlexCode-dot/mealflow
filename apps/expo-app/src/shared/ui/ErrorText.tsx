import { Text } from 'react-native';

export function ErrorText({ children }: { children: string }) {
  return <Text style={{ color: '#b00020' }}>{children}</Text>;
}
