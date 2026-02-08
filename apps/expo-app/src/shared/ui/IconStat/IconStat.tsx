import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  icon: ReactNode;
  label: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  iconWrapStyle?: StyleProp<ViewStyle>;
};

export function IconStat({ icon, label, style, labelStyle, iconWrapStyle }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.root, style]}>
      <View style={[styles.iconWrap, iconWrapStyle]}>{icon}</View>
      <Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.s1,
      paddingHorizontal: 5,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
  });
