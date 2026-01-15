import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  rightAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  footerFullBleed?: boolean;
  overlay?: ReactNode;
};

export function FormSheet({
  visible,
  title,
  onClose,
  rightAction,
  children,
  footer,
  footerFullBleed = false,
  overlay,
}: Props) {
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
      sheetStyle={sheetStyle}
      sheetInnerStyle={sheetInnerStyle}
      overlay={overlay}
    >
      <View style={styles.container}>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.s2,
    marginBottom: theme.spacing.s4,
  },
  headerSide: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  headerAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
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
  },
  container: {
    position: 'relative',
  },
});
