import { PickerSelect, PickerSheet } from '@/src/shared/ui';

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
      <PickerSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Select theme"
      />
    </PickerSheet>
  );
}
