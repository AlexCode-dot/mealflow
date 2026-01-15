import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/src/shared/theme/theme';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';

export type BottomActionBarItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  items: BottomActionBarItem[];
};

export function BottomActionBar({ items }: Props) {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom > 0 ? Math.max(8, insets.bottom - 6) : 10;
  const barHeight = TAB_BAR.BOX_HEIGHT + TAB_BAR.PADDING_TOP + paddingBottom;

  return (
    <View style={[styles.root, { paddingBottom, minHeight: barHeight }]}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          style={[styles.slot, item.disabled ? styles.actionDisabled : null]}
          disabled={item.disabled}
        >
          <View style={styles.box}>
            <View style={styles.iconBox}>{item.icon}</View>
            <View style={styles.labelWrap} pointerEvents="none">
              <Text style={styles.label}>{item.label}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingTop: TAB_BAR.PADDING_TOP,
    paddingHorizontal: 28,
    alignItems: 'flex-end',
    gap: 12,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
  },
  box: {
    height: TAB_BAR.BOX_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  iconBox: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  labelWrap: {
    position: 'absolute',
    bottom: 0,
    height: TAB_BAR.LABEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    left: -TAB_BAR.LABEL_OVERHANG,
    right: -TAB_BAR.LABEL_OVERHANG,
  },
  label: {
    color: theme.colors.textOnPrimary,
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  actionDisabled: {
    opacity: 0.5,
  },
});
