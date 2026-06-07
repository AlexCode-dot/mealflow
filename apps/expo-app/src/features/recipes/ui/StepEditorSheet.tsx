import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import { FormSheet } from '@/src/shared/ui/FormSheet';
import { TextField } from '@/src/shared/ui/TextField';
import { ErrorText } from '@/src/shared/ui/ErrorText';
import { useKeyboardInset } from '@/src/shared/hooks/useKeyboardInset';
import { useKeyboardOpen } from '@/src/shared/hooks/useKeyboardOpen';
import { useScrollToFocusedInput } from '@/src/shared/hooks/useScrollToFocusedInput';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
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
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const descriptionInputRef = useRef<TextInput | null>(null);
  const isKeyboardOpen = useKeyboardOpen();
  const keyboardInset = useKeyboardInset();
  const scrollToFocusedInput = useScrollToFocusedInput(scrollRef, 12);

  return (
    <FormSheet
      visible={visible}
      title={title}
      onClose={onCancel}
      onBackdropPress={isKeyboardOpen ? Keyboard.dismiss : onCancel}
      dismissKeyboardOnSheetTap
      rightAction={
        onDelete ? (
          <Pressable onPress={onDelete} style={styles.deleteAction}>
            <Trash2 color={theme.colors.error} size={20} strokeWidth={2.2} />
            <Text style={styles.deleteLabel}>{t('common.delete')}</Text>
          </Pressable>
        ) : null
      }
      footer={<RecipeActionBar onCancel={onCancel} onSave={onSave} saveLabel={t('common.save')} />}
      footerFullBleed
    >
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, { maxHeight: Math.min(420, screenHeight * 0.5) }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: theme.spacing.s3 + (keyboardInset > 0 ? keyboardInset : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>{t('recipes.stepDescription')}</Text>
          <TextField
            inputRef={descriptionInputRef}
            value={description}
            onChangeText={onChangeDescription}
            placeholder={t('recipes.stepDescriptionPlaceholder')}
            autoCapitalize="sentences"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            inputStyle={styles.multiline}
            onFocus={() => scrollToFocusedInput(descriptionInputRef, 40)}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            maxLength={500}
          />
          {error ? <ErrorText>{error}</ErrorText> : null}
        </View>
        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{t('common.preview')}</Text>
            <View style={styles.previewDivider} />
          </View>
          <RecipeStepRow index={1} text={description || t('recipes.stepDescription')} showHandle />
        </View>
      </ScrollView>
    </FormSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      gap: theme.spacing.s3,
    },
  });
