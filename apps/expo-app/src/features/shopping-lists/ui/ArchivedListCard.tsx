import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Utensils } from 'lucide-react-native';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { formatRelativeTime } from '@/src/features/shopping-lists/utils/relativeTime';

type Props = {
  title: string;
  updatedAt: string;
  itemCount: number;
  onPress: () => void;
};

export function ArchivedListCard({ title, updatedAt, itemCount, onPress }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const archivedLabel = formatRelativeTime(updatedAt);

  return (
    <Pressable
      style={({ pressed }) => [styles.root, pressed ? styles.pressed : null]}
      onPress={onPress}
    >
      <View style={styles.body}>
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {t('shoppingLists.archivedOn', { label: archivedLabel })}
          </Text>
          <View style={styles.metaRow}>
            <Utensils size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>
              {t('shoppingLists.itemCountLabel', { count: itemCount })}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      padding: theme.spacing.s4,
    },
    pressed: {
      opacity: 0.9,
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
    },
    text: {
      flex: 1,
      gap: theme.spacing.s1,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
    },
    metaText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
  });
