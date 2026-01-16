import type { ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightSlot?: ReactNode;
  onTitlePress?: () => void;
};

const HEADER_HEIGHT = 54;
const CONTENT_OFFSET_Y = -6; // 👈 subtle upward bias (try -6 if you want it tighter)

export function AppHeader({
  title,
  showBack = false,
  onBackPress,
  rightSlot,
  onTitlePress,
}: Props) {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          height: HEADER_HEIGHT + insets.top,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            transform: [{ translateY: CONTENT_OFFSET_Y }],
          },
        ]}
      >
        <View style={styles.side}>
          {showBack ? (
            <Pressable onPress={handleBack} hitSlop={10} style={styles.iconBtn}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={32}
                color={theme.colors.textOnPrimary}
              />
            </Pressable>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        <View style={styles.center}>
          {title ? (
            onTitlePress ? (
              <Pressable onPress={onTitlePress} hitSlop={6}>
                <Text
                  style={[styles.title, title.length > 15 ? styles.titleCompact : null]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
              </Pressable>
            ) : (
              <Text
                style={[styles.title, title.length > 15 ? styles.titleCompact : null]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {title}
              </Text>
            )
          ) : null}
        </View>

        <View style={styles.side}>{rightSlot ?? <View style={styles.iconBtn} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.s4,
  },

  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  side: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: theme.colors.textOnPrimary,
    fontSize: 26,
    fontWeight: '500',
  },
  titleCompact: {
    fontSize: 22,
  },
});
