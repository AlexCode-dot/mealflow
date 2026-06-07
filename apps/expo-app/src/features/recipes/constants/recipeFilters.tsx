import type { FilterSection } from '@/src/shared/ui/FilterSheet';
import { Clock3, Users, Tag, MapPin } from 'lucide-react-native';
import { type Theme } from '@/src/shared/theme';
import type { TFunction } from 'i18next';
import {
  RECIPE_PORTIONS_OPTIONS,
  RECIPE_TIME_OPTIONS,
} from '@/src/features/recipes/constants/recipePickerOptions';

export const buildSavedFilters = (theme: Theme, t: TFunction): FilterSection[] => [
  {
    key: 'category',
    title: t('recipes.filters.category'),
    type: 'chips',
    selectionMode: 'multi',
    layout: 'row',
    options: [
      { key: 'breakfast', label: t('recipes.filters.breakfast') },
      { key: 'lunch', label: t('recipes.filters.lunch') },
      { key: 'dinner', label: t('recipes.filters.dinner') },
      { key: 'snack', label: t('recipes.filters.snack') },
    ],
  },
  {
    key: 'ingredients',
    title: t('recipes.filters.ingredients'),
    type: 'tags',
    placeholder: t('recipes.filters.addIngredient'),
  },
  {
    key: 'time-portions',
    title: '',
    type: 'pickerRow',
    items: [
      {
        key: 'time',
        title: t('recipes.filters.cookingTime'),
        placeholder: t('recipes.filters.any'),
        icon: <Clock3 color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: RECIPE_TIME_OPTIONS.map((opt) => ({ key: opt.value, label: opt.label })),
      },
      {
        key: 'portions',
        title: t('recipes.filters.portions'),
        placeholder: t('recipes.filters.any'),
        icon: <Users color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: RECIPE_PORTIONS_OPTIONS.map((opt) => ({ key: opt.value, label: opt.label })),
      },
    ],
  },
];

export const buildDiscoveryFilters = (theme: Theme, t: TFunction): FilterSection[] => [
  {
    key: 'hideSaved',
    title: t('recipes.filters.saved'),
    type: 'segmented',
    layout: 'row',
    options: [
      { key: 'show', label: t('recipes.filters.showAll') },
      { key: 'hide', label: t('recipes.filters.hideSaved') },
      { key: 'saved', label: t('recipes.filters.saved') },
    ],
  },
  {
    key: 'discovery-pickers',
    title: '',
    type: 'pickerRow',
    items: [
      {
        key: 'category',
        title: t('recipes.filters.category'),
        placeholder: t('recipes.filters.any'),
        icon: <Tag color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: [
          { key: 'Beef', label: 'Beef' },
          { key: 'Chicken', label: 'Chicken' },
          { key: 'Dessert', label: 'Dessert' },
          { key: 'Pasta', label: 'Pasta' },
          { key: 'Seafood', label: 'Seafood' },
          { key: 'Vegetarian', label: 'Vegetarian' },
        ],
      },
      {
        key: 'area',
        title: t('recipes.filters.cuisine'),
        placeholder: t('recipes.filters.any'),
        icon: <MapPin color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: [
          { key: 'American', label: 'American' },
          { key: 'British', label: 'British' },
          { key: 'French', label: 'French' },
          { key: 'Indian', label: 'Indian' },
          { key: 'Italian', label: 'Italian' },
          { key: 'Mexican', label: 'Mexican' },
          { key: 'Thai', label: 'Thai' },
        ],
      },
    ],
  },
  {
    key: 'ingredients',
    title: t('recipes.filters.ingredients'),
    type: 'tags',
    placeholder: t('recipes.filters.addIngredient'),
  },
];
