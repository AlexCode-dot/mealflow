import { StyleSheet } from 'react-native';
import { theme } from '@/src/shared/theme/theme';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';

export { TAB_BAR };

export const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: TAB_BAR.PADDING_TOP,
    paddingHorizontal: 28,
    alignItems: 'flex-end',
    gap: 12,
    position: 'relative',
    overflow: 'visible',
  },

  barFlat: {
    backgroundColor: theme.colors.primary,
  },

  barNotched: {
    backgroundColor: theme.colors.bg,
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

  centerSlot: {
    height: TAB_BAR.BOX_HEIGHT,
  },

  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },

  centerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },

  addButtonWrap: {
    position: 'absolute',
    top: -(TAB_BAR.ADD_BUTTON_SIZE / 2) + TAB_BAR.ADD_BUTTON_OFFSET,
    width: TAB_BAR.ADD_BUTTON_SIZE,
    height: TAB_BAR.ADD_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButton: {
    width: TAB_BAR.ADD_BUTTON_SIZE,
    height: TAB_BAR.ADD_BUTTON_SIZE,
    borderRadius: TAB_BAR.ADD_BUTTON_SIZE / 2,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addLabel: {
    position: 'absolute',
    top: TAB_BAR.PADDING_TOP + TAB_BAR.BOX_HEIGHT - TAB_BAR.LABEL_HEIGHT + 4,
    left: 0,
    right: 0,
    height: TAB_BAR.LABEL_HEIGHT,
    color: theme.colors.textOnPrimary,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
