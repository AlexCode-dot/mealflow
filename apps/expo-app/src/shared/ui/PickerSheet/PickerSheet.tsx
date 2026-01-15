import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/shared/ui/Button';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  doneLabel?: string;
};

type ContentProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  doneLabel?: string;
};

export function PickerSheetContent({ title, onClose, children, doneLabel = 'Done' }: ContentProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.pickerWrap}>{children}</View>
      <Button
        title={doneLabel}
        onPress={onClose}
        variant="primary"
        containerStyle={styles.button}
      />
    </View>
  );
}

export function PickerSheetOverlay({ title, onClose, children, doneLabel = 'Done' }: ContentProps) {
  return (
    <View style={styles.overlaySheet}>
      <View style={styles.handle} />
      <PickerSheetContent title={title} onClose={onClose} doneLabel={doneLabel}>
        {children}
      </PickerSheetContent>
    </View>
  );
}

export function PickerSheet({ visible, title, onClose, children, doneLabel = 'Done' }: Props) {
  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <PickerSheetContent title={title} onClose={onClose} doneLabel={doneLabel}>
        {children}
      </PickerSheetContent>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing.s2,
    paddingTop: theme.spacing.s2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.s1,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  button: {
    borderRadius: theme.radius.pill,
    minHeight: 50,
  },
  overlaySheet: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: theme.spacing.s4,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
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
});
