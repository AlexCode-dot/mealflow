import { Picker } from '@react-native-picker/picker';
import { PickerSheet } from '@/src/shared/ui';

type Option = {
  label: string;
  value: string;
};

type Props = {
  visible: boolean;
  title: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onClose: () => void;
  onDone?: () => void;
  doneLabel?: string;
};

export function RecipePickerSheet({
  visible,
  title,
  value,
  options,
  onChange,
  onClose,
  onDone,
  doneLabel,
}: Props) {
  return (
    <PickerSheet
      visible={visible}
      title={title}
      onClose={onClose}
      onDone={onDone}
      doneLabel={doneLabel}
    >
      <Picker selectedValue={value} onValueChange={(v) => onChange(String(v))}>
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
    </PickerSheet>
  );
}
