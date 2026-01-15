import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Boxes, Scale, Trash2 } from 'lucide-react-native';
import { PickerSheetOverlay } from '@/src/shared/ui';
import { ErrorText } from '@/src/shared/ui/ErrorText';
import { FormSheet } from '@/src/shared/ui/FormSheet';
import { TextField } from '@/src/shared/ui/TextField';
import { theme } from '@/src/shared/theme/theme';
import { RecipeAmountField } from '@/src/features/recipes/ui/RecipeAmountField';
import { RecipeActionBar } from '@/src/features/recipes/ui/RecipeActionBar';
import { RecipeIngredientRow } from '@/src/features/recipes/ui/RecipeIngredientRow';
import { RecipeSelectField } from '@/src/features/recipes/ui/RecipeSelectField';

const UNITS = [
  { key: 'pcs', label: 'pcs' },
  { key: 'g', label: 'g' },
  { key: 'kg', label: 'kg' },
  { key: 'ml', label: 'ml' },
  { key: 'l', label: 'l' },
] as const;

type Props = {
  visible: boolean;
  title: string;
  name: string;
  unit: string;
  amount: string;
  onChangeName: (v: string) => void;
  onChangeUnit: (v: string) => void;
  onChangeAmount: (v: string) => void;
  nameError?: string;
  unitError?: string;
  amountError?: string;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function IngredientEditorSheet({
  visible,
  title,
  name,
  unit,
  amount,
  onChangeName,
  onChangeUnit,
  onChangeAmount,
  nameError,
  unitError,
  amountError,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState<'unit' | null>(null);
  const unitLabel = useMemo(() => {
    const selected = UNITS.find((u) => u.key === unit);
    return selected?.label ?? '';
  }, [unit]);
  const amountPrefix = unitLabel || 'Unit';
  const handleAmountChange = (value: string) => {
    const sanitized = sanitizeAmountInput(value, unit);
    onChangeAmount(sanitized);
  };

  const overlay = pickerOpen ? (
    <View style={styles.pickerOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(null)} />
      {pickerOpen === 'unit' ? (
        <PickerSheetOverlay title="Unit" onClose={() => setPickerOpen(null)}>
          <Picker selectedValue={unit} onValueChange={(v) => onChangeUnit(String(v))}>
            <Picker.Item label="Select unit" value="" />
            {UNITS.map((u) => (
              <Picker.Item key={u.key} label={u.label} value={u.key} />
            ))}
          </Picker>
        </PickerSheetOverlay>
      ) : null}
    </View>
  ) : null;

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
      overlay={overlay}
    >
      <View style={styles.section}>
        <Text style={styles.label}>Ingredient name</Text>
        <TextField
          value={name}
          onChangeText={onChangeName}
          placeholder="Name..."
          autoCapitalize="words"
          maxLength={80}
        />
        {nameError ? <ErrorText>{nameError}</ErrorText> : null}
      </View>

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Unit</Text>
          <RecipeSelectField
            icon={<Boxes color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
            value={unitLabel}
            placeholder="Select unit"
            onPress={() => setPickerOpen('unit')}
          />
          {unitError ? <ErrorText>{unitError}</ErrorText> : null}
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Amount</Text>
          <RecipeAmountField
            icon={<Scale color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
            prefix={amountPrefix}
            value={amount}
            onChangeText={handleAmountChange}
          />
          {amountError ? <ErrorText>{amountError}</ErrorText> : null}
        </View>
      </View>

      <View style={styles.preview}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewDivider} />
        </View>
        <RecipeIngredientRow
          name={name || 'Ingredient'}
          amount={amount ? `${amount}${unit ? ` ${unit}` : ''}` : ''}
          showHandle
        />
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
  row: {
    flexDirection: 'row',
    gap: theme.spacing.s3,
  },
  rowItem: {
    flex: 1,
    gap: theme.spacing.s2,
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
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});

function sanitizeAmountInput(value: string, unit: string) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  const normalized = rest.length ? `${whole}.${rest.join('')}` : whole;

  const integerPart = normalized.split('.')[0];
  const decimalPart = normalized.split('.')[1] ?? '';

  if (unit === 'pcs') {
    return integerPart.slice(0, 3);
  }

  const maxInt = unit === 'kg' || unit === 'l' ? 3 : 4;
  const limitedInt = integerPart.slice(0, maxInt);
  const limitedDecimals = decimalPart.slice(0, 2);

  return limitedDecimals ? `${limitedInt}.${limitedDecimals}` : limitedInt;
}
