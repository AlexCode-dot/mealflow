import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

export type UnderlineTabsBarTab<K extends string = string> = { key: K; label: string };

type Variant = 'editor' | 'details';

type Props<K extends string = string> = {
  tabs: UnderlineTabsBarTab<K>[];
  value: K;
  onChange: (key: K) => void;
  variant?: Variant;
};

export function UnderlineTabsBar<K extends string>({
  tabs,
  value,
  onChange,
  variant = 'editor',
}: Props<K>) {
  return (
    <View style={[styles.root, variant === 'details' ? styles.rootDetails : null]}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)}>
            <Text
              style={[
                styles.label,
                variant === 'details' ? styles.labelDetails : null,
                active ? styles.labelActive : styles.labelInactive,
              ]}
            >
              {tab.label}
            </Text>
            <View
              style={[
                styles.underline,
                variant === 'details' ? styles.underlineDetails : null,
                active ? styles.underlineActive : styles.underlineInactive,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.s3,
    paddingBottom: theme.spacing.s2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.dividerSoft,
  },
  rootDetails: {
    paddingTop: theme.spacing.s4,
  },
  tab: {
    alignItems: 'center',
    gap: theme.spacing.s1,
    minWidth: 90,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
  labelDetails: {
    fontSize: 16,
    fontWeight: '700',
  },
  labelActive: {
    color: theme.colors.primaryDark,
  },
  labelInactive: {
    color: theme.colors.textMuted,
  },
  underline: {
    height: 2,
    width: 70,
    borderRadius: 999,
  },
  underlineDetails: {
    width: 80,
  },
  underlineActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  underlineInactive: {
    backgroundColor: 'transparent',
  },
});
