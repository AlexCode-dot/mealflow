import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { IconStat } from '@/src/shared/ui/IconStat';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type IconStatItem = {
  icon: ReactNode;
  label: string;
};

type Props = {
  items: IconStatItem[];
  labelStyle?: StyleProp<TextStyle>;
  iconWrapStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
};

export function IconStatRow({ items, labelStyle, iconWrapStyle, rowStyle }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.row, rowStyle]}>
      {items.map((item, index) => (
        <IconStat
          key={`${index}-${item.label}`}
          icon={item.icon}
          label={item.label}
          labelStyle={labelStyle}
          iconWrapStyle={iconWrapStyle}
        />
      ))}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: theme.spacing.s3,
    },
  });
