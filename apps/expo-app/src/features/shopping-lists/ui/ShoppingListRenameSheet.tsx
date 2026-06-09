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
  value: string;
  onChangeText: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  disabled?: boolean;
  formError?: string | null;
};

export function ShoppingListRenameSheet({
  visible,
  title,
  value,
  onChangeText,
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
  const inputRef = useRef<TextInput | null>(null);
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
      maxHeight={Math.min(220, screenHeight * 0.28)}
      extraHeight={extraHeight}
      scrollRef={scrollRef}
      footer={
        <>
          {formError ? (
            <View style={styles.footerErrorWrap}>
              <Text style={styles.formError}>{formError}</Text>
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
        inputRef={inputRef}
        label={t('shoppingLists.fields.listNameLabel')}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('shoppingLists.fields.listNamePlaceholder')}
        onFocus={() => focusInput(inputRef, 8)}
        onBlur={clearFocus}
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
    </ScrollableFormSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
