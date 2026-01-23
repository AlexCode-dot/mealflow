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
import type { BottomActionBarItem } from '@/src/shared/ui/BottomActionBar';
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
  const { actions, mode, centerAction } = useBottomBarState();
  const activeRouteName = state.routes[state.index]?.name;
  const showAddRecipe = activeRouteName === 'recipes';

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      if (nextWidth !== layoutWidth) setLayoutWidth(nextWidth);
    },
    [layoutWidth],
  );

  if (mode !== 'default' && actions && actions.length) {
    if (mode === 'flat-actions') {
      return <BottomActionBar items={actions} />;
    }
    if (mode === 'notched-actions' && centerAction) {
      return (
        <NotchedActionBar
          items={actions}
          centerAction={centerAction}
          barHeight={barHeight}
          layoutWidth={layoutWidth}
          paddingBottom={paddingBottom}
          onLayout={handleLayout}
        />
      );
    }
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

  const tabHrefByName: Record<string, string> = {
    recipes: routes.recipes,
    overview: routes.overview,
    'shopping-list': routes.shoppingList,
    'weekly-planner': routes.weeklyPlanner,
    settings: routes.settings,
    'settings/index': routes.settings,
  };
  const labelByName: Record<string, string> = {
    settings: 'Settings',
  };
  const normalizeRouteName = (name: string) =>
    name.endsWith('/index') ? name.slice(0, -'/index'.length) : name;

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
        const normalizedRouteName = normalizeRouteName(route.name);
        const label = String(
          options?.tabBarLabel ??
            options?.title ??
            labelByName[normalizedRouteName] ??
            normalizedRouteName,
        );
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            const href = tabHrefByName[route.name] ?? tabHrefByName[normalizedRouteName];
            if (href) {
              router.replace(href);
              return;
            }
            if (!isFocused) {
              navigation.navigate(route.name as never);
            }
          }
        };

        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

        return (
          <TabItem
            key={route.key}
            routeKey={route.key}
            routeName={normalizedRouteName}
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

type NotchedActionBarProps = {
  items: BottomActionBarItem[];
  centerAction: {
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  barHeight: number;
  layoutWidth: number;
  paddingBottom: number;
  onLayout: (event: LayoutChangeEvent) => void;
};

function NotchedActionBar({
  items,
  centerAction,
  barHeight,
  layoutWidth,
  paddingBottom,
  onLayout,
}: NotchedActionBarProps) {
  const midpoint = Math.ceil(items.length / 2);
  const left = items.slice(0, midpoint);
  const right = items.slice(midpoint);

  return (
    <View style={[styles.bar, styles.barNotched, { paddingBottom }]} onLayout={onLayout}>
      <TabBarBackground width={layoutWidth} height={barHeight} />
      {left.map((item) => (
        <ActionSlot key={item.key} item={item} />
      ))}
      <View style={[styles.slot, styles.centerSlot]} />
      {right.map((item) => (
        <ActionSlot key={item.key} item={item} />
      ))}

      <View style={styles.centerOverlay} pointerEvents="box-none">
        <View style={styles.addButtonWrap} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={centerAction.accessibilityLabel ?? centerAction.label}
            onPress={centerAction.onPress}
            hitSlop={10}
            style={styles.addButton}
          >
            {centerAction.icon}
          </Pressable>
        </View>
        <Text style={styles.addLabel} numberOfLines={1}>
          {centerAction.label}
        </Text>
      </View>
    </View>
  );
}

function ActionSlot({ item }: { item: BottomActionBarItem }) {
  return (
    <Pressable onPress={item.onPress} style={styles.slot} disabled={item.disabled}>
      <View style={styles.box}>
        <View style={[styles.iconBox, { marginBottom: 8 }]}>{item.icon}</View>
        <View style={styles.labelWrap} pointerEvents="none">
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
