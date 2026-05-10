import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Image as ImageIcon, PenLine, Video } from 'lucide-react-native';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { routes } from '@/src/core/navigation/routes';
import type { Href } from 'expo-router';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Row = {
  key: 'manual' | 'photo' | 'video';
  title: string;
  subtitle?: string;
  icon: (color: string) => React.ReactNode;
  href: Href;
};

const ROWS: Row[] = [
  {
    key: 'manual',
    title: 'Write it yourself',
    icon: (color) => <PenLine color={color} size={20} strokeWidth={2.25} />,
    href: routes.recipeNew,
  },
  {
    key: 'photo',
    title: 'From a photo',
    subtitle: 'Screenshot of a recipe',
    icon: (color) => <ImageIcon color={color} size={20} strokeWidth={2.25} />,
    href: { pathname: '/recipes/import', params: { autostart: 'image' } } as Href,
  },
  {
    key: 'video',
    title: 'From a video',
    subtitle: 'TikTok, Reel or short clip',
    icon: (color) => <Video color={color} size={20} strokeWidth={2.25} />,
    href: { pathname: '/recipes/import', params: { autostart: 'video' } } as Href,
  },
];

export function AddRecipeSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const handlePress = (row: Row) => {
    onClose();
    // Defer navigation so the sheet can finish closing before the next screen mounts.
    requestAnimationFrame(() => router.push(row.href));
  };

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>Add a recipe</Text>
      </View>

      <View style={styles.rows}>
        {ROWS.map((row) => (
          <Pressable
            key={row.key}
            onPress={() => handlePress(row)}
            style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            accessibilityRole="button"
            accessibilityLabel={row.title}
          >
            <View style={styles.iconBox}>{row.icon(theme.colors.primaryDark)}</View>
            <View style={styles.text}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              {row.subtitle ? <Text style={styles.rowSubtitle}>{row.subtitle}</Text> : null}
            </View>
            <ChevronRight color={theme.colors.textMuted} size={18} strokeWidth={2.25} />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.cancel, pressed ? styles.cancelPressed : null]}
        accessibilityRole="button"
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </ModalSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      paddingTop: theme.spacing.s1,
      paddingBottom: theme.spacing.s4,
    },
    title: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    rows: {
      gap: theme.spacing.s2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingVertical: theme.spacing.s3,
      paddingHorizontal: theme.spacing.s3,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
    },
    rowPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.995 }],
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    text: {
      flex: 1,
      gap: 1,
    },
    rowTitle: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    rowSubtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    cancel: {
      marginTop: theme.spacing.s4,
      paddingVertical: theme.spacing.s2,
      alignItems: 'center',
    },
    cancelPressed: {
      opacity: 0.6,
    },
    cancelText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
  });
