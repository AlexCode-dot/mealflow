import { useState } from 'react';
import { View } from 'react-native';
import { TextField } from '@/src/shared/ui/TextField';
import { Button } from '@/src/shared/ui/Button';
import { ErrorText } from '@/src/shared/ui/ErrorText';

export function LoginForm({
  onSubmit,
  isLoading,
  error,
}: {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  return (
    <View style={{ gap: 12 }}>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
      />

      {error ? <ErrorText>{error}</ErrorText> : null}

      <Button
        title={isLoading ? 'Logging in...' : 'Login'}
        onPress={() => onSubmit(email, password)}
        disabled={!canSubmit}
      />
    </View>
  );
}
