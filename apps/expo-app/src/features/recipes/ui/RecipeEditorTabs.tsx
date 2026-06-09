import { useTranslation } from 'react-i18next';
import { UnderlineTabsBar } from '@/src/shared/ui';
import type { UnderlineTabsBarTab } from '@/src/shared/ui';

export type RecipeEditorTabKey = 'basic' | 'ingredients' | 'steps';

type Props = {
  value: RecipeEditorTabKey;
  onChange: (value: RecipeEditorTabKey) => void;
};

export function RecipeEditorTabs({ value, onChange }: Props) {
  const { t } = useTranslation();
  const tabs: UnderlineTabsBarTab<RecipeEditorTabKey>[] = [
    { key: 'basic', label: t('recipes.tabBasic') },
    { key: 'ingredients', label: t('recipes.tabIngredients') },
    { key: 'steps', label: t('recipes.tabSteps') },
  ];
  return <UnderlineTabsBar tabs={tabs} value={value} onChange={onChange} variant="editor" />;
}
