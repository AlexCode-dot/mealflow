import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';

export function ProfileButton() {
  return (
    <Pressable onPress={() => router.push(routes.profile)} hitSlop={10} style={styles.iconBtn}>
      <UserRound color={theme.colors.textOnPrimary} size={32} strokeWidth={2.25} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
