// apps/expo-app/src/shared/ui/Screen/Screen.tsx
import type { ReactNode } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppHeader } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { ProfileButton } from './ProfileButton';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
  showBack?: boolean;
  showProfileIcon?: boolean;
  rightSlot?: React.ReactNode;

  /**
   * Optional pull-to-refresh control for the internal ScrollView
   * (only used when scroll=true).
   */
  refreshControl?: React.ReactElement<RefreshControlProps>;

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
  showProfileIcon = true,
  rightSlot,
  refreshControl,
  contentStyle,
}: Props) {
  const headerRight = rightSlot ?? (showProfileIcon ? <ProfileButton /> : undefined);

  return (
    <View style={styles.root}>
      <AppHeader title={title} showBack={showBack} rightSlot={headerRight} />

      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={refreshControl}>
          <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
