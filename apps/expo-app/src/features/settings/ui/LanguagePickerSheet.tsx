import { useTranslation } from 'react-i18next';
import { PickerSelect, PickerSheet } from '@/src/shared/ui';
import type { Language } from '@/src/shared/i18n';

type Option = {
  label: string;
  value: string;
};

type Props = {
  visible: boolean;
  value: Language;
  onChange: (value: Language) => void;
  onClose: () => void;
};

export function LanguagePickerSheet({ visible, value, onChange, onClose }: Props) {
  const { t } = useTranslation();

  const options: Option[] = [
    { label: t('settings.language.auto'), value: 'auto' },
    { label: t('settings.language.en'), value: 'en' },
    { label: t('settings.language.sv'), value: 'sv' },
  ];

  return (
    <PickerSheet
      visible={visible}
      title={t('settings.language.pickerTitle')}
      onClose={onClose}
      onDone={onClose}
    >
      <PickerSelect
        value={value}
        onChange={(v) => onChange(v as Language)}
        options={options}
        placeholder={t('settings.language.selectPlaceholder')}
      />
    </PickerSheet>
  );
}
