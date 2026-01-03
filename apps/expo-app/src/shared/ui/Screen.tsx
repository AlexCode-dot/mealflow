import { ReactNode } from 'react';
import { View } from 'react-native';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>{children}</View>;
}
