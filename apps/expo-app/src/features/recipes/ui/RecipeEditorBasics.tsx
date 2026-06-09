import type { RefObject } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { Clock, Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ErrorText, TextField } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { RecipeSelectField } from '@/src/features/recipes/ui/RecipeSelectField';
import type { RecipePickerKey } from '@/src/features/recipes/hooks/useRecipeEditorState';

type Props = {
  title: string;
  onTitleChange: (value: string) => void;
  onTitleBlur?: () => void;
  titleError?: string | null;
  description: string;
  onDescriptionChange: (value: string) => void;
  onDescriptionBlur?: () => void;
  descriptionError?: string | null;
  titleInputRef?: RefObject<TextInput | null>;
  descriptionInputRef?: RefObject<TextInput | null>;
  onTitleFocus?: () => void;
  onDescriptionFocus?: () => void;
  time: string;
  portions: string;
  category: string;
  onOpenPicker: (picker: RecipePickerKey) => void;
};

export function RecipeEditorBasics({
  title,
  onTitleChange,
  onTitleBlur,
  titleError,
  description,
  onDescriptionChange,
  onDescriptionBlur,
  descriptionError,
  titleInputRef,
  descriptionInputRef,
  onTitleFocus,
  onDescriptionFocus,
  time,
  portions,
  category,
  onOpenPicker,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('recipes.recipeNameLabel')}</Text>
      <TextField
        inputRef={titleInputRef}
        value={title}
        onChangeText={onTitleChange}
        placeholder={t('recipes.ingredientNamePlaceholder')}
        returnKeyType="next"
        onFocus={() => onTitleFocus?.()}
        onBlur={onTitleBlur}
        maxLength={120}
        invalid={Boolean(titleError)}
      />
      {titleError ? <ErrorText>{titleError}</ErrorText> : null}

      <Text style={styles.label}>{t('recipes.descriptionLabel')}</Text>
      <TextField
        inputRef={descriptionInputRef}
        value={description}
        onChangeText={onDescriptionChange}
        placeholder={t('recipes.descriptionPlaceholder')}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        inputStyle={styles.multiline}
        onFocus={() => onDescriptionFocus?.()}
        onBlur={onDescriptionBlur}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        maxLength={2000}
      />
      {descriptionError ? <ErrorText>{descriptionError}</ErrorText> : null}

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>{t('recipes.cookingTimeLabel')}</Text>
          <RecipeSelectField
            icon={<Clock color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
            prefix={t('recipes.minPrefix')}
            value={time || '0'}
            onPress={() => onOpenPicker('time')}
          />
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>{t('recipes.portions')}</Text>
          <RecipeSelectField
            icon={<Users color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
            prefix={t('recipes.portPrefix')}
            value={portions || '0'}
            onPress={() => onOpenPicker('portions')}
          />
        </View>
      </View>

      <Text style={styles.label}>{t('recipes.categoryLabel')}</Text>
      <RecipeSelectField
        value={category}
        placeholder={t('recipes.foodCategoryPlaceholder')}
        onPress={() => onOpenPicker('category')}
      />
    </View>
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
      fontWeight: '600',
    },
    multiline: {
      minHeight: 110,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.s3,
    },
    rowItem: {
      flex: 1,
      gap: theme.spacing.s2,
    },
  });
