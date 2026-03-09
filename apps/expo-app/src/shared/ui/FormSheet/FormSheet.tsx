import type { ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onBackdropPress?: () => void;
  rightAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  footerFullBleed?: boolean;
  overlay?: ReactNode;
  avoidKeyboard?: boolean;
  keyboardVerticalOffset?: number;
  keyboardBehavior?: 'height' | 'position' | 'padding';
  dismissKeyboardOnSheetTap?: boolean;
  dismissKeyboardOnBackdropTap?: boolean;
};

export function FormSheet({
  visible,
  title,
  onClose,
  onBackdropPress,
  rightAction,
  children,
  footer,
  footerFullBleed = false,
  overlay,
  avoidKeyboard = false,
  keyboardVerticalOffset,
  keyboardBehavior,
  dismissKeyboardOnSheetTap = false,
  dismissKeyboardOnBackdropTap = false,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const sheetStyle = footerFullBleed
    ? {
        paddingBottom: 0,
        borderBottomWidth: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }
    : undefined;
  const sheetInnerStyle = footerFullBleed ? { transform: [{ translateY: 0 }] } : undefined;

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      onBackdropPress={onBackdropPress}
      sheetStyle={sheetStyle}
      sheetInnerStyle={sheetInnerStyle}
      overlay={overlay}
      avoidKeyboard={avoidKeyboard}
      keyboardVerticalOffset={keyboardVerticalOffset}
      keyboardBehavior={keyboardBehavior}
      dismissKeyboardOnBackdropTap={dismissKeyboardOnBackdropTap}
    >
      <View style={styles.container}>
        {dismissKeyboardOnSheetTap ? (
          <Pressable
            style={styles.keyboardDismissArea}
            onPress={Keyboard.dismiss}
            accessible={false}
          />
        ) : null}
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.headerSide, styles.headerAction]}>{rightAction ?? null}</View>
        </View>

        <View style={styles.content}>{children}</View>
        {footer ? (
          <View style={[styles.footer, footerFullBleed ? styles.footerBleed : null]}>{footer}</View>
        ) : null}
      </View>
    </ModalSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.s2,
      marginBottom: theme.spacing.s4,
    },
    headerSide: {
      minWidth: 32,
      alignItems: 'flex-end',
    },
    headerAction: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '600',
      textAlign: 'center',
      flex: 1,
      paddingHorizontal: 4,
    },
    content: {
      gap: theme.spacing.s3,
    },
    footer: {
      marginTop: theme.spacing.s4,
    },
    footerBleed: {
      marginHorizontal: -theme.spacing.s4,
      marginBottom: 0,
      marginTop: 0,
    },
    container: {
      position: 'relative',
    },
    keyboardDismissArea: {
      ...StyleSheet.absoluteFillObject,
    },
  });
