import { Text, TextInput, View, StyleSheet, type TextInputProps } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

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
  const submitBehavior: TextInputProps['submitBehavior'] =
    returnKeyType === 'done' ? 'blurAndSubmit' : 'submit';

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>

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
        style={[styles.input, invalid ? styles.inputInvalid : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: theme.spacing.s2 },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputInvalid: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorBg,
  },
});
