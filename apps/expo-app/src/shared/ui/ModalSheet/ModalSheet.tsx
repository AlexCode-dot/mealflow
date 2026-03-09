import type { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { useKeyboardOpen } from '@/src/shared/hooks/useKeyboardOpen';
import { WEB, isWeb } from '@/src/shared/ui/webStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onBackdropPress?: () => void;
  dismissKeyboardOnBackdropTap?: boolean;
  avoidKeyboard?: boolean;
  children: ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
  sheetInnerStyle?: StyleProp<ViewStyle>;
  overlay?: ReactNode;
  webFullBleed?: boolean;
  keyboardVerticalOffset?: number;
  keyboardBehavior?: 'height' | 'position' | 'padding';
};

export function ModalSheet({
  visible,
  onClose,
  onBackdropPress,
  dismissKeyboardOnBackdropTap = false,
  avoidKeyboard = true,
  children,
  sheetStyle,
  sheetInnerStyle,
  overlay,
  webFullBleed = false,
  keyboardVerticalOffset = 0,
  keyboardBehavior = 'position',
}: Props) {
  const styles = useThemedStyles(createStyles);
  const isKeyboardOpen = useKeyboardOpen();

  const handleBackdropPress = () => {
    if (dismissKeyboardOnBackdropTap && isKeyboardOpen) {
      Keyboard.dismiss();
      return;
    }
    (onBackdropPress ?? onClose)();
  };

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
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
        {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
        <KeyboardAvoidingView
          enabled={!isWeb && avoidKeyboard}
          behavior={Platform.OS === 'ios' ? keyboardBehavior : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={styles.keyboardAvoider}
        >
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    keyboardAvoider: {
      width: '100%',
      justifyContent: 'flex-end',
    },
  });
