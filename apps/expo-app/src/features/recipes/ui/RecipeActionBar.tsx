import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Download, XCircle } from 'lucide-react-native';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { BottomActionBar, resolveBottomActionBarColor } from '@/src/shared/ui/BottomActionBar';

type ActionItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
};

type Props =
  | {
      items: ActionItem[];
    }
  | {
      items?: undefined;
      onCancel: () => void;
      onSave: () => void;
      saveLabel?: string;
      disabled?: boolean;
    };

export function RecipeActionBar(props: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const actionColor = resolveBottomActionBarColor(theme);
  const items =
    'items' in props && props.items
      ? props.items
      : [
          {
            key: 'cancel',
            label: 'Cancel',
            icon: <XCircle color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />,
            onPress: props.onCancel,
          },
          {
            key: 'save',
            label: props.saveLabel ?? 'Save recipe',
            icon: <Download color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />,
            onPress: props.onSave,
            disabled: props.disabled,
          },
        ];

  return (
    <View>
      <View style={styles.spacer} />
      <BottomActionBar items={items} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    spacer: {
      height: theme.spacing.s3,
    },
  });
