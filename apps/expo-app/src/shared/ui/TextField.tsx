import { Text, TextInput, View } from 'react-native';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
};

export function TextField(props: Props) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '600' }}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        secureTextEntry={props.secureTextEntry}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        keyboardType={props.keyboardType ?? 'default'}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 10,
          fontSize: 16,
        }}
      />
    </View>
  );
}
