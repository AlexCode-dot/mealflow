import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefObject,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { KeyboardDoneAccessory } from '@/src/shared/ui/KeyboardDoneAccessory/KeyboardDoneAccessory';

type Props = {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;

  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  numberOfLines?: number;
  textAlignVertical?: TextInputProps['textAlignVertical'];
  maxLength?: TextInputProps['maxLength'];
  onFocus?: TextInputProps['onFocus'];
  onBlur?: () => void;
  inputRef?: RefObject<TextInput | null>;
  containerStyle?: StyleProp<ViewStyle>;

  invalid?: boolean;

  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  textAlignVertical,
  maxLength,
  onFocus,
  onBlur,
  inputRef,
  invalid = false,
  returnKeyType,
  onSubmitEditing,
  containerStyle,
  inputStyle,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const submitBehavior: TextInputProps['submitBehavior'] =
    returnKeyType === 'done' ? 'blurAndSubmit' : 'submit';
  const accessoryKey = (label ?? placeholder ?? 'input').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const needsDoneAccessory =
    Platform.OS === 'ios' &&
    (keyboardType === 'numeric' || keyboardType === 'number-pad' || keyboardType === 'decimal-pad');
  const accessoryId = needsDoneAccessory ? `text-field-accessory-${accessoryKey}` : undefined;

  return (
    <>
      <View style={[styles.root, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={textAlignVertical}
          maxLength={maxLength}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={returnKeyType ? submitBehavior : undefined}
          inputAccessoryViewID={accessoryId}
          accessibilityLabel={label ?? placeholder}
          accessibilityHint={invalid ? 'Invalid input' : undefined}
          style={[styles.input, invalid ? styles.inputInvalid : null, inputStyle]}
        />
      </View>
      {accessoryId ? <KeyboardDoneAccessory nativeID={accessoryId} /> : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
