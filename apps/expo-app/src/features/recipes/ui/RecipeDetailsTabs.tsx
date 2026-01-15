import { UnderlineTabsBar } from '@/src/shared/ui';
import type { UnderlineTabsBarTab } from '@/src/shared/ui';

export type RecipeDetailsTab = 'ingredients' | 'steps';

const TABS: UnderlineTabsBarTab<RecipeDetailsTab>[] = [
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'steps', label: 'Steps' },
];

type Props = {
  value: RecipeDetailsTab;
  onChange: (tab: RecipeDetailsTab) => void;
};

export function RecipeDetailsTabs({ value, onChange }: Props) {
  return <UnderlineTabsBar tabs={TABS} value={value} onChange={onChange} variant="details" />;
}
