import type { Ref } from 'react';
import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
  label?: string;
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  returnKeyType?: TextInputProps['returnKeyType'];
  inputRef?: Ref<TextInput>;
};

export function InlineAddField({
  value,
  onChangeText,
  onAdd,
  placeholder,
  label,
  onFocus,
  onBlur,
  autoCapitalize = 'sentences',
  returnKeyType = 'go',
  inputRef,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const canAdd = value.trim().length > 0;

  return (
    <View style={styles.root}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          onFocus={onFocus}
          onBlur={onBlur}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onAdd}
          submitBehavior="submit"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${label?.toLowerCase() ?? placeholder.toLowerCase()}`}
          onPress={onAdd}
          disabled={!canAdd}
          style={({ pressed }) => [
            styles.addButton,
            !canAdd ? styles.addButtonDisabled : null,
            pressed && canAdd ? styles.addButtonPressed : null,
          ]}
        >
          <Plus size={18} color={theme.colors.tabBarAddButtonIcon} strokeWidth={2.6} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      gap: theme.spacing.s2,
    },
    label: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
      borderRadius: theme.radius.sm,
      overflow: 'hidden',
    },
    input: {
      flex: 1,
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.colors.text,
    },
    addButton: {
      alignSelf: 'stretch',
      minHeight: 0,
      minWidth: 48,
      borderRadius: 0,
      paddingHorizontal: theme.spacing.s2,
      paddingVertical: 0,
      backgroundColor: theme.colors.tabBarAddButtonBg,
      borderWidth: 0,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.borderNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonDisabled: {
      opacity: 0.45,
    },
    addButtonPressed: {
      opacity: 0.85,
    },
  });
