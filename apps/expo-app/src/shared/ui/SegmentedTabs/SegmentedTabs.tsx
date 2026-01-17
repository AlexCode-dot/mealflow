import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

export type SegmentedTab = { key: string; label: string };

type Props = {
  tabs: SegmentedTab[];
  value: string;
  onChange: (key: string) => void;
};

export function SegmentedTabs({ tabs, value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => [
              styles.tab,
              active ? styles.tabActive : styles.tabInactive,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primaryLight,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    borderRadius: theme.radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInactive: {
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  textInactive: {
    color: theme.colors.primaryDark,
    opacity: 0.8,
  },
  textActive: {
    color: theme.colors.textOnPrimary,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
});
