import { StyleSheet, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;

  variant?: 'pill' | 'rounded';
};

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search…',
  variant = 'pill',
}: Props) {
  return (
    <View style={[styles.root, variant === 'rounded' ? styles.rounded : styles.pill]}>
      <Search color={theme.colors.textMuted} size={20} strokeWidth={2.5} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        returnKeyType="search"
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    paddingHorizontal: 16,
    minHeight: 52,
  },

  pill: {
    borderRadius: theme.radius.pill,
    paddingVertical: 10,
  },

  rounded: {
    borderRadius: 16,
    paddingVertical: 0,
  },

  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    paddingVertical: 0,
  },
});
