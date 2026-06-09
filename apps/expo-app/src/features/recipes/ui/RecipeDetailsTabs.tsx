import { useTranslation } from 'react-i18next';
import { UnderlineTabsBar } from '@/src/shared/ui';
import type { UnderlineTabsBarTab } from '@/src/shared/ui';

export type RecipeDetailsTab = 'ingredients' | 'steps';

type Props = {
  value: RecipeDetailsTab;
  onChange: (tab: RecipeDetailsTab) => void;
};

export function RecipeDetailsTabs({ value, onChange }: Props) {
  const { t } = useTranslation();
  const tabs: UnderlineTabsBarTab<RecipeDetailsTab>[] = [
    { key: 'ingredients', label: t('recipes.tabIngredients') },
    { key: 'steps', label: t('recipes.tabSteps') },
  ];
  return <UnderlineTabsBar tabs={tabs} value={value} onChange={onChange} variant="details" />;
}
