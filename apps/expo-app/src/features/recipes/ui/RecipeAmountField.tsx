import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  icon?: ReactNode;
  prefix?: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'decimal-pad' | 'number-pad';
};

export function RecipeAmountField({
  icon,
  prefix,
  value,
  placeholder = '0',
  onChangeText,
  keyboardType = 'decimal-pad',
}: Props) {
  const hasValue = value !== '';

  return (
    <View style={styles.field}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <View style={styles.textRow}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        {prefix ? <View style={styles.divider} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          style={[styles.input, !hasValue ? styles.placeholder : null]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
