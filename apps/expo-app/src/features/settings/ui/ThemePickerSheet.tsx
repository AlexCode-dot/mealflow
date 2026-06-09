import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <PickerSheet visible={visible} title={t('settings.theme')} onClose={onClose} onDone={onClose}>
      <PickerSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={t('settings.selectThemePlaceholder')}
      />
    </PickerSheet>
  );
}
