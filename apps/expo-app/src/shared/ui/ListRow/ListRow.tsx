import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
};

export function ListRow({ title, subtitle, onPress, right }: Props) {
  const isPressable = Boolean(onPress);

  return (
    <Pressable
      onPress={onPress}
      disabled={!isPressable}
      style={({ pressed }) => [styles.root, isPressable && pressed ? styles.pressed : null]}
    >
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 52,
    paddingVertical: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bgLight,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s4,
  },
  pressed: {
    opacity: 0.85,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  right: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
