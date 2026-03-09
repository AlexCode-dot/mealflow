import type { ReactNode, RefObject } from 'react';
import { Keyboard, ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { useKeyboardInset } from '@/src/shared/hooks/useKeyboardInset';
import { useKeyboardOpen } from '@/src/shared/hooks/useKeyboardOpen';
import { FormSheet } from '@/src/shared/ui/FormSheet';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  rightAction?: ReactNode;
  footer?: ReactNode;
  footerFullBleed?: boolean;
  overlay?: ReactNode;
  maxHeight: number;
  extraHeight?: number;
  scrollRef?: RefObject<ScrollView | null>;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  scrollStyle?: ScrollViewProps['style'];
  onBackdropPress?: () => void;
};

export function ScrollableFormSheet({
  visible,
  title,
  onClose,
  children,
  rightAction,
  footer,
  footerFullBleed = true,
  overlay,
  maxHeight,
  extraHeight = 0,
  scrollRef,
  contentContainerStyle,
  scrollStyle,
  onBackdropPress,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const keyboardInset = useKeyboardInset();
  const isKeyboardOpen = useKeyboardOpen();
  const resolvedMaxHeight = maxHeight + extraHeight;

  return (
    <FormSheet
      visible={visible}
      title={title}
      onClose={onClose}
      onBackdropPress={onBackdropPress ?? (isKeyboardOpen ? Keyboard.dismiss : onClose)}
      dismissKeyboardOnSheetTap
      footer={footer}
      footerFullBleed={footerFullBleed}
      rightAction={rightAction}
      overlay={overlay}
    >
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, { maxHeight: resolvedMaxHeight }, scrollStyle]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: theme.spacing.s3 + (keyboardInset > 0 ? keyboardInset : 0) },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </FormSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      gap: theme.spacing.s3,
    },
  });
