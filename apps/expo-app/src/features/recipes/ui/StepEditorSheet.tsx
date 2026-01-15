import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { FormSheet } from '@/src/shared/ui/FormSheet';
import { TextField } from '@/src/shared/ui/TextField';
import { ErrorText } from '@/src/shared/ui/ErrorText';
import { theme } from '@/src/shared/theme/theme';
import { RecipeStepRow } from '@/src/features/recipes/ui/RecipeStepRow';
import { RecipeActionBar } from '@/src/features/recipes/ui/RecipeActionBar';

type Props = {
  visible: boolean;
  title: string;
  description: string;
  onChangeDescription: (v: string) => void;
  error?: string | null;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function StepEditorSheet({
  visible,
  title,
  description,
  onChangeDescription,
  error,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  return (
    <FormSheet
      visible={visible}
      title={title}
      onClose={onCancel}
      rightAction={
        onDelete ? (
          <Pressable onPress={onDelete} style={styles.deleteAction}>
            <Trash2 color={theme.colors.error} size={20} strokeWidth={2.2} />
            <Text style={styles.deleteLabel}>Delete</Text>
          </Pressable>
        ) : null
      }
      footer={<RecipeActionBar onCancel={onCancel} onSave={onSave} saveLabel="Save" />}
      footerFullBleed
    >
      <View style={styles.section}>
        <Text style={styles.label}>Step description</Text>
        <TextField
          value={description}
          onChangeText={onChangeDescription}
          placeholder="Description..."
          autoCapitalize="sentences"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputStyle={styles.multiline}
          maxLength={500}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
      </View>

      <View style={styles.preview}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewDivider} />
        </View>
        <RecipeStepRow index={1} text={description || 'Step description'} showHandle />
      </View>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.s2,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  multiline: {
    minHeight: 120,
  },
  preview: {
    gap: theme.spacing.s2,
  },
  previewHeader: {
    gap: theme.spacing.s2,
  },
  previewTitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  previewDivider: {
    height: 1,
    backgroundColor: theme.colors.borderNeutral,
  },
  deleteAction: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
