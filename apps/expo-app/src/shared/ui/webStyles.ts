import { Platform, type TextStyle } from 'react-native';

export const isWeb = Platform.OS === 'web';

export const WEB = {
  frameMaxWidth: 520,
  shellPadding: 8,
  headerTopInset: 12,
  tabBarPaddingBottom: 16,
  modalSheetMaxWidth: 520,
  modalSheetPaddingHorizontal: 20,
  modalSheetPaddingBottom: 0,
  pickerListMaxWidth: 480,
} as const;

export const WEB_TEXT_ELLIPSIS: TextStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
