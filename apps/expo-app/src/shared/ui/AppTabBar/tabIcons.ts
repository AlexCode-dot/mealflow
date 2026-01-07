import {
  Home,
  CalendarDays,
  ShoppingBasket,
  Settings as SettingsIcon,
  Utensils,
  type LucideIcon,
} from 'lucide-react-native';

type RouteName = 'recipes' | 'shopping-list' | 'overview' | 'weekly-planner' | 'settings';

export function getTabIcon(routeName: string): LucideIcon {
  switch (routeName as RouteName) {
    case 'recipes':
      return Utensils;
    case 'shopping-list':
      return ShoppingBasket;
    case 'overview':
      return Home;
    case 'weekly-planner':
      return CalendarDays;
    case 'settings':
      return SettingsIcon;
    default:
      return Home;
  }
}
