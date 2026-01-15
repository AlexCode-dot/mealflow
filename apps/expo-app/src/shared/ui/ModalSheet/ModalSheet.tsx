import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  sheetInnerStyle?: StyleProp<ViewStyle>;
  overlay?: ReactNode;
};

export function ModalSheet({
  visible,
  onClose,
  children,
  sheetStyle,
  sheetInnerStyle,
  overlay,
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
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
        <View style={[styles.sheet, sheetStyle]}>
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
  sheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: theme.spacing.s4,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
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
