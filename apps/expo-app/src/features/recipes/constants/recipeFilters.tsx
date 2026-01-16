import type { FilterSection } from '@/src/shared/ui/FilterSheet';
import { Clock3, Users } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';
import {
  RECIPE_PORTIONS_OPTIONS,
  RECIPE_TIME_OPTIONS,
} from '@/src/features/recipes/constants/recipePickerOptions';

export const SAVED_FILTERS: FilterSection[] = [
  {
    key: 'category',
    title: 'Category',
    type: 'chips',
    selectionMode: 'multi',
    layout: 'row',
    options: [
      { key: 'breakfast', label: 'Breakfast' },
      { key: 'lunch', label: 'Lunch' },
      { key: 'dinner', label: 'Dinner' },
      { key: 'snack', label: 'Snack' },
    ],
  },
  {
    key: 'ingredients',
    title: 'Ingredients',
    type: 'tags',
    placeholder: 'Add ingredient',
  },
  {
    key: 'time-portions',
    title: '',
    type: 'pickerRow',
    items: [
      {
        key: 'time',
        title: 'Cooking time',
        placeholder: 'Any',
        icon: <Clock3 color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: RECIPE_TIME_OPTIONS.map((opt) => ({ key: opt.value, label: opt.label })),
      },
      {
        key: 'portions',
        title: 'Portions',
        placeholder: 'Any',
        icon: <Users color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: RECIPE_PORTIONS_OPTIONS.map((opt) => ({ key: opt.value, label: opt.label })),
      },
    ],
  },
];

export const DISCOVERY_FILTERS: FilterSection[] = [
  {
    key: 'category',
    title: 'Category',
    type: 'chips',
    selectionMode: 'multi',
    layout: 'row',
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
    title: 'Cuisine',
    type: 'chips',
    selectionMode: 'multi',
    layout: 'row',
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
  {
    key: 'ingredients',
    title: 'Ingredients',
    type: 'tags',
    placeholder: 'Add ingredient',
  },
];
