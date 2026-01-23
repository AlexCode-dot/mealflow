import { Picker } from '@react-native-picker/picker';
import { PickerSheet } from '@/src/shared/ui';

type Option = {
  label: string;
  value: string;
};

type Props = {
  visible: boolean;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onClose: () => void;
};

export function ThemePickerSheet({ visible, value, options, onChange, onClose }: Props) {
  return (
    <PickerSheet visible={visible} title="Theme" onClose={onClose} onDone={onClose}>
      <Picker selectedValue={value} onValueChange={(next) => onChange(String(next))}>
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
    </PickerSheet>
  );
}
