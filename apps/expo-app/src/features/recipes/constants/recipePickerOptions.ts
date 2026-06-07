import type { TFunction } from 'i18next';

export const RECIPE_TIME_OPTIONS = [
  { label: '0', value: '0' },
  { label: '10', value: '10' },
  { label: '20', value: '20' },
  { label: '30', value: '30' },
  { label: '45', value: '45' },
  { label: '60', value: '60' },
];

export const RECIPE_PORTIONS_OPTIONS = [
  { label: '0', value: '0' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '4', value: '4' },
  { label: '6', value: '6' },
];

export const getRecipeCategoryOptions = (t: TFunction) => [
  { label: t('recipes.categories.selectCategory'), value: '' },
  { label: t('recipes.categories.breakfast'), value: 'Breakfast' },
  { label: t('recipes.categories.lunch'), value: 'Lunch' },
  { label: t('recipes.categories.dinner'), value: 'Dinner' },
  { label: t('recipes.categories.snack'), value: 'Snack' },
];
