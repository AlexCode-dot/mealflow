import { UnderlineTabsBar } from '@/src/shared/ui';
import type { UnderlineTabsBarTab } from '@/src/shared/ui';

export type RecipeEditorTabKey = 'basic' | 'ingredients' | 'steps';

const TABS: UnderlineTabsBarTab<RecipeEditorTabKey>[] = [
  { key: 'basic', label: 'Basic' },
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'steps', label: 'Steps' },
] as const;

type Props = {
  value: RecipeEditorTabKey;
  onChange: (value: RecipeEditorTabKey) => void;
};

export function RecipeEditorTabs({ value, onChange }: Props) {
  return <UnderlineTabsBar tabs={TABS} value={value} onChange={onChange} variant="editor" />;
}
