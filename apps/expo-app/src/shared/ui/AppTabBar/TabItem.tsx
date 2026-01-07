import { Pressable, View, Animated } from 'react-native';
import { useMemo } from 'react';
import { theme } from '@/src/shared/theme/theme';
import { getTabIcon } from './tabIcons';
import { useFocusAnim } from './useFocusAnim';
import { styles, TAB_BAR } from './AppTabBar.styles';

type Props = {
  routeKey: string;
  routeName: string;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
};

export function TabItem({
  routeKey,
  routeName,
  label,
  isFocused,
  onPress,
  onLongPress,
  accessibilityLabel,
}: Props) {
  const Icon = useMemo(() => getTabIcon(routeName), [routeName]);
  const { scale, iconTranslateY, labelOpacity, labelTranslateY } = useFocusAnim({
    isFocused,
    labelHeight: TAB_BAR.LABEL_HEIGHT,
  });

  return (
    <Pressable
      key={routeKey}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={10}
      style={styles.slot}
    >
      <View style={styles.box}>
        <Animated.View
          style={[styles.iconBox, { transform: [{ translateY: iconTranslateY }, { scale }] }]}
        >
          <Icon
            color={theme.colors.textOnPrimary}
            size={isFocused ? TAB_BAR.ICON_SIZE_ACTIVE : TAB_BAR.ICON_SIZE}
            strokeWidth={TAB_BAR.ICON_STROKE}
          />
        </Animated.View>

        <View style={styles.labelWrap} pointerEvents="none">
          {isFocused ? (
            <Animated.Text
              numberOfLines={1}
              ellipsizeMode="clip"
              allowFontScaling={false}
              style={[
                styles.label,
                { opacity: labelOpacity, transform: [{ translateY: labelTranslateY }] },
              ]}
            >
              {label}
            </Animated.Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
