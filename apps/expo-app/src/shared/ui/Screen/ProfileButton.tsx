import { Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { routes } from '@/src/core/navigation/routes';
import { normalizePath } from '@/src/core/navigation/normalizePath';

export function ProfileButton() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const pathname = usePathname();
  const normalizedPath = normalizePath(pathname ?? null);
  const returnTo = normalizedPath && normalizedPath !== routes.profile ? normalizedPath : undefined;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: routes.profile,
          params: returnTo ? { returnTo } : undefined,
        })
      }
      hitSlop={10}
      style={styles.iconBtn}
    >
      <UserRound color={theme.colors.textOnPrimary} size={32} strokeWidth={2.25} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    iconBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
