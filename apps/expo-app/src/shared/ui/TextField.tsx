import { Text, TextInput, View, TextInputProps } from 'react-native';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;

  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: TextInputProps['keyboardType'];

  onBlur?: () => void;

  invalid?: boolean;

  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  onBlur,
  invalid = false,
  returnKeyType,
  onSubmitEditing,
}: Props) {
  const borderColor = invalid ? '#b00020' : '#ddd';
  const backgroundColor = invalid ? '#fff5f5' : '#fff';

  const submitBehavior: TextInputProps['submitBehavior'] =
    returnKeyType === 'done' ? 'blurAndSubmit' : 'submit';

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: '600' }}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onBlur={onBlur}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        submitBehavior={returnKeyType ? submitBehavior : undefined}
        accessibilityLabel={label}
        accessibilityHint={invalid ? 'Invalid input' : undefined}
        style={{
          borderWidth: 1,
          borderColor,
          backgroundColor,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 10,
          fontSize: 16,
        }}
      />
    </View>
  );
}
