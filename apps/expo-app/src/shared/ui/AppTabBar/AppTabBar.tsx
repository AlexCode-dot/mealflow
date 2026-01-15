import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { routes } from '@/src/core/navigation/routes';
import { theme } from '@/src/shared/theme/theme';
import { styles } from './AppTabBar.styles';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { TabItem } from './TabItem';
import { BottomActionBar } from '@/src/shared/ui/BottomActionBar';
import { useBottomBarState } from '@/src/shared/ui/BottomBar';

type TabRoute = {
  route: BottomTabBarProps['state']['routes'][number];
  index: number;
  options: Record<string, unknown>;
};

type TabSlot = { type: 'tab'; item: TabRoute } | { type: 'center-action'; key: string };

type TabBarBackgroundProps = {
  width: number;
  height: number;
};

function TabBarBackground({ width, height }: TabBarBackgroundProps) {
  const path = useMemo(() => {
    if (!width) return '';

    const notchWidth = Math.min(TAB_BAR.NOTCH_WIDTH, width * 0.6);
    const notchDepth = TAB_BAR.NOTCH_DEPTH;
    const notchCurve = TAB_BAR.NOTCH_CURVE;
    const centerX = width / 2;
    const left = centerX - notchWidth / 2;
    const right = centerX + notchWidth / 2;
    const curve = Math.min(notchCurve, notchWidth * 0.4);

    return [
      `M 0 0`,
      `H ${left}`,
      `C ${left + curve} 0 ${centerX - curve} ${notchDepth} ${centerX} ${notchDepth}`,
      `C ${centerX + curve} ${notchDepth} ${right - curve} 0 ${right} 0`,
      `H ${width}`,
      `V ${height}`,
      `H 0`,
      `Z`,
    ].join(' ');
  }, [height, width]);

  if (!path) return null;

  return (
    <Svg width={width} height={height} style={styles.background} pointerEvents="none">
      <Path d={path} fill={theme.colors.primary} />
    </Svg>
  );
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom > 0 ? Math.max(8, insets.bottom - 6) : 10;
  const barHeight = TAB_BAR.BOX_HEIGHT + TAB_BAR.PADDING_TOP + paddingBottom;
  const [layoutWidth, setLayoutWidth] = useState(0);
  const { actions } = useBottomBarState();
  const activeRouteName = state.routes[state.index]?.name;
  const showAddRecipe = activeRouteName === 'recipes';

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      if (nextWidth !== layoutWidth) setLayoutWidth(nextWidth);
    },
    [layoutWidth],
  );

  if (actions) {
    return <BottomActionBar items={actions} />;
  }

  const tabRoutes = state.routes
    .map((route, index) => {
      const descriptor = descriptors[route.key];
      const options = (descriptor?.options ?? {}) as Record<string, unknown>;
      return { route, index, options };
    })
    .filter(({ route, options }) => route.name !== 'profile' && options?.href !== null);

  const slots: TabSlot[] = showAddRecipe
    ? (() => {
        const filtered = tabRoutes.filter(({ route }) => route.name !== 'recipes');
        const midpoint = Math.ceil(filtered.length / 2);
        const left = filtered.slice(0, midpoint).map((item) => ({ type: 'tab', item }) as TabSlot);
        const right = filtered.slice(midpoint).map((item) => ({ type: 'tab', item }) as TabSlot);
        return [...left, { type: 'center-action', key: 'add-recipe' }, ...right];
      })()
    : tabRoutes.map((item) => ({ type: 'tab', item }));

  return (
    <View
      style={[styles.bar, showAddRecipe ? styles.barNotched : styles.barFlat, { paddingBottom }]}
      onLayout={handleLayout}
    >
      {showAddRecipe ? <TabBarBackground width={layoutWidth} height={barHeight} /> : null}
      {slots.map((slot) => {
        if (slot.type === 'center-action') {
          return <View key={slot.key} style={[styles.slot, styles.centerSlot]} />;
        }

        const { route, index, options } = slot.item;
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
            accessibilityLabel={options?.tabBarAccessibilityLabel as string | undefined}
          />
        );
      })}

      {showAddRecipe ? (
        <View style={styles.centerOverlay}>
          <View style={styles.addButtonWrap} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add recipe"
              onPress={() => router.push(routes.recipeNew)}
              hitSlop={10}
              style={styles.addButton}
            >
              <Plus color={theme.colors.textOnPrimary} size={38} strokeWidth={2.75} />
            </Pressable>
          </View>
          <Text style={styles.addLabel} numberOfLines={1}>
            Add Recipe
          </Text>
        </View>
      ) : null}
    </View>
  );
}
