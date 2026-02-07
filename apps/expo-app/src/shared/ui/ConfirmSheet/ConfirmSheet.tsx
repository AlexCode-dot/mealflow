import { StyleSheet, Text, View } from 'react-native';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { Button } from '@/src/shared/ui/Button';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function ConfirmSheet({
  visible,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'danger',
  disabled,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <ModalSheet visible={visible} onClose={onCancel}>
      <View style={styles.root}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.actions}>
          <Button
            title={cancelLabel}
            variant="secondary"
            onPress={onCancel}
            containerStyle={styles.actionButton}
            textStyle={styles.actionText}
          />
          <Button
            title={confirmLabel}
            variant={confirmVariant}
            onPress={onConfirm}
            disabled={disabled}
            containerStyle={styles.actionButton}
            textStyle={styles.actionText}
          />
        </View>
      </View>
    </ModalSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      gap: theme.spacing.s4,
      paddingTop: theme.spacing.s4,
      paddingBottom: theme.spacing.s4,
      minHeight: 230,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 34,
      textAlign: 'center',
      color: theme.colors.text,
    },
    description: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 22,
      textAlign: 'center',
      color: theme.colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.s3,
      justifyContent: 'center',
      marginTop: 'auto',
    },
    actionButton: {
      flex: 1,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.s3 + 2,
    },
    actionText: {
      fontSize: 16,
      fontWeight: '700',
    },
  });
