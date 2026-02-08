import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { SearchField, UnderlineTabs } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Tab = {
  key: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  value: string;
  onChange: (key: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onFilterPress: () => void;
  activeFilterCount: number;
  hint?: string;
};

export function RecipeListHeader({
  tabs,
  value,
  onChange,
  query,
  onQueryChange,
  onFilterPress,
  activeFilterCount,
  hint,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.root}>
      <UnderlineTabs tabs={tabs} value={value} onChange={onChange} />

      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <SearchField
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search for recipes..."
            variant="rounded"
          />
        </View>

        <Pressable
          onPress={onFilterPress}
          hitSlop={theme.spacing.s2}
          style={({ pressed }) => [styles.filterBtn, pressed ? styles.pressed : null]}
        >
          <SlidersHorizontal color={theme.colors.primaryDark} size={22} strokeWidth={2.5} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      gap: theme.spacing.s4,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s1,
    },
    searchField: {
      flex: 1,
    },
    filterBtn: {
      width: 64,
      height: 52,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: theme.colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.bg,
    },
    filterBadgeText: {
      color: theme.colors.textOnPrimary,
      fontSize: 10,
      fontWeight: '900',
      lineHeight: 12,
    },
    muted: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    pressed: {
      opacity: 0.9,
    },
  });
