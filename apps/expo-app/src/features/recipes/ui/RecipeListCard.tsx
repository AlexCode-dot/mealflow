import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { IconStat, Shimmer } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';

type MetaStat = {
  icon: ReactNode;
  label: string;
};

type Props = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onPress: () => void;
  metaLeft?: MetaStat | null;
  metaMiddle?: MetaStat | null;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
};

export function RecipeListCard({
  title,
  subtitle = '–',
  imageUrl,
  onPress,
  metaLeft,
  metaMiddle,
  onSave,
  saveLabel = 'Save',
  saveDisabled = false,
}: Props) {
  const leftMeta = metaLeft ?? null;
  const middleMeta = metaMiddle ?? null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.imageFrame}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <Shimmer height={96} borderRadius={16} />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>

        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>

        <View style={styles.metaRow}>
          {leftMeta ? <IconStat icon={leftMeta.icon} label={leftMeta.label} /> : null}
          {middleMeta ? <IconStat icon={middleMeta.icon} label={middleMeta.label} /> : null}
          {onSave ? (
            <Pressable
              style={({ pressed }) => [
                styles.saveWrap,
                pressed ? styles.savePressed : null,
                saveDisabled ? styles.saveDisabled : null,
              ]}
              onPress={onSave}
              disabled={saveDisabled}
            >
              <IconStat
                icon={<Bookmark color={theme.colors.primaryDark} size={26} strokeWidth={2.4} />}
                label={saveLabel}
              />
            </Pressable>
          ) : (
            <View style={styles.saveWrap}>
              <IconStat
                icon={<Bookmark color={theme.colors.primaryDark} size={26} strokeWidth={2.4} />}
                label={saveLabel}
              />
            </View>
          )}
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
  image: {
    width: '100%',
    height: 96,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.s2,
  },

  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
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
  savePressed: {
    opacity: 0.8,
  },
  saveDisabled: {
    opacity: 0.45,
  },

  pressed: {
    opacity: 0.9,
  },
});
