import type { ReactElement, ReactNode, RefObject } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { AppHeader } from '@/src/shared/ui/AppHeader';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { ProfileButton } from './ProfileButton';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showProfileIcon?: boolean;
  rightSlot?: ReactNode;
  onTitlePress?: () => void;

  /**
   * Optional pull-to-refresh control for the internal ScrollView
   * (only used when scroll=true).
   */
  refreshControl?: ReactElement<RefreshControlProps>;

  /**
   * Optional scroll ref + handler for long lists.
   */
  scrollRef?: RefObject<ScrollView>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;

  /**
   * Optional extra styling for the content wrapper.
   */
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  title,
  showBack = false,
  onBack,
  showProfileIcon = true,
  rightSlot,
  onTitlePress,
  refreshControl,
  contentStyle,
  scrollRef,
  onScroll,
  scrollEventThrottle = 16,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const headerRight = rightSlot ?? (showProfileIcon ? <ProfileButton /> : undefined);

  return (
    <View style={styles.root}>
      <AppHeader
        title={title}
        showBack={showBack}
        onBackPress={onBack}
        rightSlot={headerRight}
        onTitlePress={onTitlePress}
      />

      {scroll ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContainer}
          refreshControl={refreshControl}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    fill: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    content: {
      padding: theme.spacing.s4,
      gap: theme.spacing.s4,
    },
  });
