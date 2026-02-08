import type { ReactNode } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { WEB, WEB_TEXT_ELLIPSIS, isWeb } from '@/src/shared/ui/webStyles';

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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const topInset = isWeb ? WEB.headerTopInset : insets.top;

  const handleBack = () => {
    if (onBackPress) return onBackPress();
    if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: topInset,
          height: HEADER_HEIGHT + topInset,
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
              <MaterialCommunityIcons name="arrow-left" size={32} color={theme.colors.headerText} />
            </Pressable>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        <View style={styles.center}>
          {title ? (
            onTitlePress ? (
              <Pressable onPress={onTitlePress} hitSlop={6} style={styles.titlePressable}>
                <Text
                  style={[
                    styles.title,
                    title.length > 15 ? styles.titleCompact : null,
                    isWeb ? styles.titleWeb : null,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
              </Pressable>
            ) : (
              <Text
                style={[
                  styles.title,
                  title.length > 15 ? styles.titleCompact : null,
                  isWeb ? styles.titleWeb : null,
                ]}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      backgroundColor: theme.colors.headerBg,
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
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    title: {
      color: theme.colors.headerText,
      fontSize: 26,
      fontWeight: '500',
      maxWidth: '100%',
      flexShrink: 1,
      textAlign: 'center',
    },
    titleCompact: {
      fontSize: 22,
    },
    titlePressable: {
      maxWidth: '100%',
      flexShrink: 1,
    },
    titleWeb: {
      ...WEB_TEXT_ELLIPSIS,
    },
  });
