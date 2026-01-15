import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

export type UnderlineTab = { key: string; label: string };

type Props = {
  tabs: UnderlineTab[];
  value: string;
  onChange: (key: string) => void;
};

export function UnderlineTabs({ tabs, value, onChange }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.row}>
          {tabs.map((t) => {
            const active = t.key === value;

            return (
              <Pressable
                key={t.key}
                onPress={() => onChange(t.key)}
                style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}
              >
                <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },

  container: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 16,
    padding: 6,
  },

  row: {
    flexDirection: 'row',
    gap: 0,
    alignItems: 'center',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },

  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  labelActive: {
    color: theme.colors.textOnPrimary,
    fontWeight: '800',
  },

  labelInactive: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },

  tabActive: {
    backgroundColor: theme.colors.primary,
  },

  tabInactive: {
    backgroundColor: 'transparent',
  },

  divider: {
    height: 0,
  },
});
