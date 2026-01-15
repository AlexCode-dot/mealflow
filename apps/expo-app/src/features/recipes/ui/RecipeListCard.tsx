import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bookmark, Heart, ShoppingBasket } from 'lucide-react-native';
import { IconStat, Shimmer } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  title: string;
  timeLabel?: string;
  caloriesLabel?: string;
  likes?: number;
  saves?: number;
  onPress: () => void;
};

export function RecipeListCard({
  title,
  timeLabel = '–',
  caloriesLabel = '–',
  likes,
  saves,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.imageFrame}>
        <Shimmer height={96} borderRadius={16} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.subtitle} numberOfLines={1}>
          {timeLabel} · {caloriesLabel}
        </Text>

        <View style={styles.metaRow}>
          <IconStat
            icon={<Heart color={theme.colors.primaryDark} size={26} strokeWidth={2.4} />}
            label={String(likes ?? '–')}
          />
          <IconStat
            icon={<ShoppingBasket color={theme.colors.primaryDark} size={26} strokeWidth={2.4} />}
            label={String(saves ?? '–')}
          />
          <View style={styles.saveWrap}>
            <IconStat
              icon={<Bookmark color={theme.colors.primaryDark} size={26} strokeWidth={2.4} />}
              label="Save"
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: theme.spacing.s3,
    padding: theme.spacing.s3,
    marginBottom: theme.spacing.s3,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGreen,
    backgroundColor: theme.colors.surface,
  },

  imageFrame: {
    width: 118,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.s2,
  },

  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },

  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.s4,
    marginTop: theme.spacing.s2,
  },

  saveWrap: {
    marginLeft: 'auto',
    alignItems: 'center',
  },

  pressed: {
    opacity: 0.9,
  },
});
