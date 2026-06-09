import { useRef } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { RecipeActionBar } from '@/src/features/recipes/ui/RecipeActionBar';
import { useFocusedInputSheetAdjustment } from '@/src/shared/hooks/useFocusedInputSheetAdjustment';
import { ScrollableFormSheet, TextField } from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

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
