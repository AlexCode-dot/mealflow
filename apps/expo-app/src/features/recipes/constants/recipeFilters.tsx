import type { FilterSection } from '@/src/shared/ui/FilterSheet';
import { CalendarDays, Clock3, Flame, Users, ArrowDownUp } from 'lucide-react-native';
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
    key: 'diet',
    title: 'Diet',
    type: 'chips',
    selectionMode: 'multi',
    layout: 'row',
    options: [
      { key: 'vegetarian', label: 'Vegetarian' },
      { key: 'vegan', label: 'Vegan' },
      { key: 'gluten-free', label: 'Gluten-free' },
      { key: 'dairy-free', label: 'Dairy-free' },
    ],
  },
  {
    key: 'ingredients',
    title: 'Ingredients',
    type: 'tags',
    placeholder: 'Add ingredient',
  },
  {
    key: 'time-sort',
    title: '',
    type: 'pickerRow',
    items: [
      {
        key: 'time',
        title: 'Cooking time',
        placeholder: 'Any',
        icon: <Clock3 color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: [
          { key: 'under-30', label: 'Under 30 min' },
          { key: '30-60', label: '30–60 min' },
          { key: '60-plus', label: '60+ min' },
        ],
      },
      {
        key: 'calories',
        title: 'Calories',
        placeholder: 'Any',
        icon: <Flame color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: [
          { key: 'under-300', label: 'Under 300' },
          { key: '300-600', label: '300–600' },
          { key: '600-plus', label: '600+' },
        ],
      },
    ],
  },
  {
    key: 'sort-date',
    title: '',
    type: 'pickerRow',
    items: [
      {
        key: 'sort',
        title: 'Sort by',
        placeholder: 'Popular',
        icon: <ArrowDownUp color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: [
          { key: 'popular', label: 'Most liked' },
          { key: 'quick', label: 'Quickest' },
          { key: 'new', label: 'Newest' },
        ],
      },
      {
        key: 'date',
        title: 'Date',
        placeholder: 'Any',
        icon: <CalendarDays color={theme.colors.primaryDark} size={20} strokeWidth={2.3} />,
        options: [
          { key: 'anytime', label: 'Any time' },
          { key: 'last-week', label: 'Last 7 days' },
          { key: 'last-month', label: 'Last 30 days' },
        ],
      },
    ],
  },
];
