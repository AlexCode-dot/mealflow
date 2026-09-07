import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, InlineAddField } from '@/src/shared/ui';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  tags: string[];
  onChange: (next: string[]) => void;
  /** Tags the user already used elsewhere, offered as one-tap suggestions. */
  suggestions?: string[];
  maxTags?: number;
};

const DEFAULT_MAX_TAGS = 10;

/**
 * Free-form labels for a recipe ("vegetariskt", "barnmat"). Suggestions come from tags the user
 * has used before, which is what keeps them from drifting into near-duplicates.
 */
export function RecipeTagEditor({ tags, onChange, suggestions = [], maxTags = DEFAULT_MAX_TAGS }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [draft, setDraft] = useState('');

  const isFull = tags.length >= maxTags;

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || isFull) return;
    // Case-insensitive duplicate check so "Vegetariskt" doesn't join "vegetariskt".
    const exists = tags.some((tag) => tag.toLowerCase() === value.toLowerCase());
    if (!exists) onChange([...tags, value]);
    setDraft('');
  };

  const removeTag = (tag: string) => onChange(tags.filter((item) => item !== tag));

  const visibleSuggestions = useMemo(() => {
    const used = new Set(tags.map((tag) => tag.toLowerCase()));
    return suggestions.filter((tag) => !used.has(tag.toLowerCase())).slice(0, 8);
  }, [suggestions, tags]);

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{t('recipes.tags.label')}</Text>

      {tags.length > 0 ? (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={`${tag}  ✕`}
              selected
              variant="recipes"
              size="compact"
              onPress={() => removeTag(tag)}
            />
          ))}
        </View>
      ) : null}

      {!isFull ? (
        <InlineAddField
          value={draft}
          onChangeText={setDraft}
          onAdd={() => addTag(draft)}
          placeholder={t('recipes.tags.placeholder')}
          autoCapitalize="none"
          returnKeyType="done"
        />
      ) : null}

      {visibleSuggestions.length > 0 && !isFull ? (
        <>
          <Text style={styles.suggestionsLabel}>{t('recipes.tags.suggestions')}</Text>
          <View style={styles.chips}>
            {visibleSuggestions.map((tag) => (
              <Chip key={tag} label={tag} size="compact" onPress={() => addTag(tag)} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      gap: theme.spacing.s2,
    },
    label: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    suggestionsLabel: {
      color: theme.colors.textMuted,
      fontSize: 12,
      marginTop: theme.spacing.s1,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.s2,
    },
  });
