import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Info, Sparkles } from 'lucide-react-native';
import { Button, Screen, TextField } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { useRecipeExtraction } from '@/src/features/recipes/hooks';
import { routes } from '@/src/core/navigation/routes';

export function SearchRecipeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { state, actions } = useRecipeExtraction();
  const [query, setQuery] = useState('');

  const isSearching = state.phase === 'processing' || state.phase === 'uploading';
  const canSearch = query.trim().length > 1 && !isSearching;

  useEffect(() => {
    if (state.phase === 'ready' && state.job?.jobId) {
      router.replace(routes.recipeImportReview(state.job.jobId));
    }
  }, [state.phase, state.job?.jobId]);

  const onSearch = async () => {
    if (!canSearch) return;
    await actions.startFromSearch(query.trim());
  };

  if (isSearching) {
    return (
      <Screen title={t('recipes.search.title')} showBack onBack={() => router.back()}>
        <View style={styles.centered}>
          <View style={styles.processingIcon}>
            <Sparkles color={theme.colors.textOnPrimary} size={36} strokeWidth={2.25} />
          </View>
          <Text style={styles.processingText}>{t('recipes.search.searching')}</Text>
          <ActivityIndicator color={theme.colors.primaryDark} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('recipes.search.title')} showBack onBack={() => router.back()} scroll>
      <Text style={styles.hint}>{t('recipes.search.hint')}</Text>

      <TextField
        label={t('recipes.search.dishLabel')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('recipes.search.placeholder')}
        autoCapitalize="sentences"
        returnKeyType="search"
        onSubmitEditing={onSearch}
      />

      {state.phase === 'failed' && state.error ? (
        <Text style={styles.error}>{state.error}</Text>
      ) : null}

      <View style={styles.action}>
        <Button
          title={t('recipes.search.cta')}
          variant="primary"
          onPress={onSearch}
          disabled={!canSearch}
        />
      </View>

      <View style={styles.disclaimer}>
        <Info color={theme.colors.textMuted} size={14} strokeWidth={2.4} />
        <Text style={styles.disclaimerText}>{t('recipes.search.disclaimer')}</Text>
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hint: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textMuted,
      lineHeight: 20,
      marginBottom: theme.spacing.s4,
    },
    action: {
      marginTop: theme.spacing.s4,
    },
    error: {
      color: theme.colors.error,
      fontSize: 13,
      fontWeight: '600',
      marginTop: theme.spacing.s2,
    },
    disclaimer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.s2,
      marginTop: theme.spacing.s5,
    },
    disclaimerText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.textMuted,
      lineHeight: 17,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.s4,
      paddingVertical: theme.spacing.s6,
    },
    processingIcon: {
      width: 84,
      height: 84,
      borderRadius: 26,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    processingText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
  });
