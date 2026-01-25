import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/src/shared/theme/theme';
import { WEB, isWeb } from '@/src/shared/ui/webStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  sheetInnerStyle?: StyleProp<ViewStyle>;
  overlay?: ReactNode;
  webFullBleed?: boolean;
};

export function ModalSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  sheetInnerStyle,
  overlay,
  webFullBleed = false,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          isWeb && styles.backdropWeb,
          isWeb && webFullBleed && styles.backdropWebFullBleed,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
        <View
          style={[
            styles.sheet,
            isWeb && styles.sheetWeb,
            isWeb && webFullBleed && styles.sheetWebFullBleed,
            sheetStyle,
          ]}
        >
          <View style={[styles.sheetInner, sheetInnerStyle]}>
            <View style={styles.handle} />
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backdropWeb: {
    alignItems: 'center',
    paddingHorizontal: WEB.modalSheetPaddingHorizontal,
    paddingBottom: WEB.modalSheetPaddingBottom,
  },
  backdropWebFullBleed: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  sheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: theme.spacing.s4,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
  },
  sheetWeb: {
    width: '100%',
    maxWidth: WEB.modalSheetMaxWidth,
    borderRadius: 24,
  },
  sheetWebFullBleed: {
    maxWidth: WEB.frameMaxWidth,
    borderRadius: 20,
  },
  sheetInner: {
    transform: [{ translateY: -5 }],
  },
  handle: {
    alignSelf: 'center',
    width: 72,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.borderNeutral,
    marginTop: 0,
    marginBottom: theme.spacing.s3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
});
