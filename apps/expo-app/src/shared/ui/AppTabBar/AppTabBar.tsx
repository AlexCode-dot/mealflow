import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './AppTabBar.styles';
import { TabItem } from './TabItem';

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom > 0 ? Math.max(8, insets.bottom - 6) : 10;

  return (
    <View style={[styles.bar, { paddingBottom }]}>
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const options = (descriptor?.options ?? {}) as any;

        if (route.name === 'profile' || options?.href === null) return null;

        const label = String(options?.tabBarLabel ?? options?.title ?? route.name);
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <TabItem
            key={route.key}
            routeKey={route.key}
            routeName={route.name}
            label={label}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityLabel={options?.tabBarAccessibilityLabel}
          />
        );
      })}
    </View>
  );
}
