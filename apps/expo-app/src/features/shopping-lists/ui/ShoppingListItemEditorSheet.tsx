import { useRef } from 'react';
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
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';
import { SHOPPING_CATEGORIES, type ShoppingCategory } from '@/src/features/shopping-lists/types';
import { RecipeActionBar } from '@/src/features/recipes/ui/RecipeActionBar';
import { useFocusedInputSheetAdjustment } from '@/src/shared/hooks/useFocusedInputSheetAdjustment';
import { ScrollableFormSheet, TextField } from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

/** Explicit map so the chip labels stay type-checked (no dynamic t() keys). */
const CATEGORY_LABEL_KEYS: Record<ShoppingCategory, ParseKeys> = {
  produce: 'shoppingLists.categories.produce',
  meat: 'shoppingLists.categories.meat',
  dairy: 'shoppingLists.categories.dairy',
  bread: 'shoppingLists.categories.bread',
  pantry: 'shoppingLists.categories.pantry',
  frozen: 'shoppingLists.categories.frozen',
  drinks: 'shoppingLists.categories.drinks',
  other: 'shoppingLists.categories.other',
};

type Props = {
  visible: boolean;
  title: string;
  name: string;
  quantity: string;
  unit: string;
  onChangeName: (value: string) => void;
  onChangeQuantity: (value: string) => void;
  onChangeUnit: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  disabled?: boolean;
  formError?: string | null;
  /** Optional aisle picker — shown when editing an existing item so a wrong guess can be fixed. */
  category?: ShoppingCategory;
  onChangeCategory?: (value: ShoppingCategory) => void;
};

export function ShoppingListItemEditorSheet({
  visible,
  title,
  name,
  quantity,
  unit,
  onChangeName,
  onChangeQuantity,
  onChangeUnit,
  onSave,
  onCancel,
  saveLabel,
  disabled = false,
  formError,
  category,
  onChangeCategory,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const nameInputRef = useRef<TextInput | null>(null);
  const quantityInputRef = useRef<TextInput | null>(null);
  const unitInputRef = useRef<TextInput | null>(null);
  const { focusInput, clearFocus, extraHeight } = useFocusedInputSheetAdjustment(scrollRef, {
    screenHeight,
    defaultKeyboardOffset: 12,
    desiredGap: 20,
  });

  return (
    <ScrollableFormSheet
      visible={visible}
      title={title}
      onClose={onCancel}
      maxHeight={Math.min(400, screenHeight * 0.48)}
      extraHeight={extraHeight}
      scrollRef={scrollRef}
      footer={
        <>
          {formError ? (
            <View style={styles.footerErrorWrap}>
              <TextFieldErrorText message={formError} />
            </View>
          ) : null}
          <RecipeActionBar
            onCancel={onCancel}
            onSave={onSave}
            saveLabel={saveLabel}
            disabled={disabled}
          />
        </>
      }
    >
      <TextField
        inputRef={nameInputRef}
        label={t('shoppingLists.fields.itemNameLabel')}
        value={name}
        onChangeText={onChangeName}
        placeholder={t('shoppingLists.fields.itemNamePlaceholder')}
        onFocus={() => focusInput(nameInputRef, 24)}
        onBlur={clearFocus}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <TextField
            inputRef={quantityInputRef}
            label={t('shoppingLists.fields.quantityLabel')}
            value={quantity}
            onChangeText={onChangeQuantity}
            placeholder={t('shoppingLists.fields.optionalPlaceholder')}
            keyboardType="numeric"
            onFocus={() => focusInput(quantityInputRef, 40)}
            onBlur={clearFocus}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
        <View style={styles.rowItem}>
          <TextField
            inputRef={unitInputRef}
            label={t('shoppingLists.fields.unitLabel')}
            value={unit}
            onChangeText={onChangeUnit}
            placeholder={t('shoppingLists.fields.optionalPlaceholder')}
            onFocus={() => focusInput(unitInputRef, 40)}
            onBlur={clearFocus}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
      </View>

      {onChangeCategory ? (
        <View style={styles.categoryBlock}>
          <Text style={styles.categoryLabel}>{t('shoppingLists.fields.categoryLabel')}</Text>
          <View style={styles.categoryChips}>
            {SHOPPING_CATEGORIES.map((value) => {
              const selected = value === category;
              return (
                <Pressable
                  key={value}
                  onPress={() => onChangeCategory(value)}
                  style={[styles.categoryChip, selected ? styles.categoryChipSelected : null]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected ? styles.categoryChipTextSelected : null,
                    ]}
                  >
                    {t(CATEGORY_LABEL_KEYS[value])}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollableFormSheet>
  );
}

function TextFieldErrorText({ message }: { message: string }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.formError}>{message}</Text>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: theme.spacing.s3,
    },
    categoryBlock: {
      gap: theme.spacing.s2,
      marginTop: theme.spacing.s3,
    },
    categoryLabel: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    categoryChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.s2,
    },
    categoryChip: {
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: 8,
      borderRadius: theme.radius.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
    },
    categoryChipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    categoryChipTextSelected: {
      color: theme.colors.primaryDark,
      fontWeight: '700',
    },
    rowItem: {
      flex: 1,
    },
    footerErrorWrap: {
      paddingHorizontal: theme.spacing.s4,
      paddingTop: theme.spacing.s3,
    },
    formError: {
      color: theme.colors.error,
      fontSize: 13,
      fontWeight: '600',
    },
  });
