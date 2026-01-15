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
    gap: 8,
    padding: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
  },
  text: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  textInactive: {
    color: theme.colors.textMuted,
  },
  textActive: {
    color: theme.colors.text,
  },
  pressed: {
    opacity: 0.9,
  },
});
