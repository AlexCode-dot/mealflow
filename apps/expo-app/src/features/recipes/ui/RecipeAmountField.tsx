import type { ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type RefObject,
  type TextInputProps,
  View,
} from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { KeyboardDoneAccessory } from '@/src/shared/ui/KeyboardDoneAccessory/KeyboardDoneAccessory';

type Props = {
  icon?: ReactNode;
  prefix?: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'decimal-pad' | 'number-pad';
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  inputRef?: RefObject<TextInput | null>;
};

export function RecipeAmountField({
  icon,
  prefix,
  value,
  placeholder = '0',
  onChangeText,
  keyboardType = 'decimal-pad',
  onFocus,
  onBlur,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const hasValue = value !== '';
  const accessoryId = Platform.OS === 'ios' ? 'recipe-amount-field-accessory' : undefined;

  return (
    <>
      <View style={styles.field}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <View style={styles.textRow}>
          {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
          {prefix ? <View style={styles.divider} /> : null}
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            keyboardType={keyboardType}
            onFocus={onFocus}
            onBlur={onBlur}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            submitBehavior={returnKeyType === 'done' ? 'blurAndSubmit' : undefined}
            inputAccessoryViewID={accessoryId}
            style={[styles.input, !hasValue ? styles.placeholder : null]}
          />
        </View>
      </View>
      {accessoryId ? <KeyboardDoneAccessory nativeID={accessoryId} /> : null}
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: 10,
      gap: theme.spacing.s2,
      minHeight: 44,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    textRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
    },
    prefix: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    divider: {
      width: 1,
      height: 18,
      backgroundColor: theme.colors.borderNeutral,
    },
    input: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
      padding: 0,
    },
    placeholder: {
      color: theme.colors.textMuted,
    },
  });
