import { StyleSheet } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

export const TAB_BAR = {
  ICON_SIZE: 32,
  ICON_SIZE_ACTIVE: 38,
  ICON_STROKE: 2.25,

  BOX_HEIGHT: 54,
  LABEL_HEIGHT: 12,

  // Enough for "Shopping List" / "Weekly Planner" without wrap or ellipsis.
  LABEL_OVERHANG: 70,
} as const;

export const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingTop: 10,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
    gap: 10,
  },

  slot: {
    flex: 1,
    alignItems: 'center',
  },

  box: {
    height: TAB_BAR.BOX_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBox: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
});
