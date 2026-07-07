import { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Mic, Sparkles, Square } from 'lucide-react-native';
import { Button, Screen, TextField } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { useVoiceCapture } from '@/src/features/recipes/hooks/useVoiceCapture';
import { useRecipeExtraction } from '@/src/features/recipes/hooks';
import { routes } from '@/src/core/navigation/routes';

export function VoiceRecipeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const voice = useVoiceCapture();
  const { state, actions } = useRecipeExtraction();

  const isListening = voice.status === 'listening';
  const isProcessing = state.phase === 'processing' || state.phase === 'uploading';
  const hasTranscript = voice.transcript.trim().length > 0;

  useEffect(() => {
    if (state.phase === 'ready' && state.job?.jobId) {
      router.replace(routes.recipeImportReview(state.job.jobId));
    }
  }, [state.phase, state.job?.jobId]);

  const onCreate = async () => {
    const text = voice.transcript.trim();
    if (!text) return;
    await actions.startFromText(text);
  };

  if (isProcessing) {
    return (
      <Screen title={t('recipes.voice.title')} showBack onBack={() => router.back()}>
        <View style={styles.centered}>
          <View style={styles.processingIcon}>
            <Sparkles color={theme.colors.textOnPrimary} size={36} strokeWidth={2.25} />
          </View>
          <Text style={styles.processingText}>{t('recipes.voice.building')}</Text>
          <ActivityIndicator color={theme.colors.primaryDark} />
        </View>
      </Screen>
    );
  }

  if (voice.status === 'denied') {
    return (
      <Screen title={t('recipes.voice.title')} showBack onBack={() => router.back()}>
        <View style={styles.centered}>
          <Text style={styles.deniedText}>{t('recipes.voice.permissionDenied')}</Text>
          <Button
            title={t('recipes.voice.openSettings')}
            variant="secondary"
            onPress={() => Linking.openSettings()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('recipes.voice.title')} showBack onBack={() => router.back()} scroll>
      <Text style={styles.hint}>{t('recipes.voice.hint')}</Text>

      <View style={styles.transcriptCard}>
        {isListening ? (
          <View style={styles.listeningRow}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningLabel}>{t('recipes.voice.listening')}</Text>
          </View>
        ) : null}

        {isListening ? (
          <Text style={styles.liveText}>
            {hasTranscript ? voice.transcript : t('recipes.voice.transcriptPlaceholder')}
          </Text>
        ) : (
          <TextField
            value={voice.transcript}
            onChangeText={voice.setTranscript}
            placeholder={t('recipes.voice.transcriptPlaceholder')}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            inputStyle={styles.transcriptInput}
          />
        )}
      </View>

      <View style={styles.micWrap}>
        <Pressable
          onPress={() => (isListening ? voice.stop() : voice.start())}
          style={[styles.micButton, isListening ? styles.micButtonActive : null]}
          accessibilityRole="button"
          accessibilityLabel={isListening ? t('recipes.voice.tapToStop') : t('recipes.voice.tapToStart')}
        >
          {isListening ? (
            <Square color={theme.colors.error} size={28} strokeWidth={2.5} />
          ) : (
            <Mic color={theme.colors.primaryDark} size={28} strokeWidth={2.5} />
          )}
        </Pressable>
        <Text style={styles.micHint}>
          {isListening ? t('recipes.voice.tapToStop') : t('recipes.voice.tapToStart')}
        </Text>
      </View>

      {hasTranscript && !isListening ? (
        <View style={styles.actions}>
          <View style={styles.actionRedo}>
            <Button title={t('recipes.voice.redo')} variant="secondary" onPress={voice.reset} />
          </View>
          <View style={styles.actionCreate}>
            <Button title={t('recipes.voice.createRecipe')} variant="primary" onPress={onCreate} />
          </View>
        </View>
      ) : null}
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
    transcriptCard: {
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
      borderRadius: theme.radius.md,
      padding: theme.spacing.s3,
      gap: theme.spacing.s2,
      minHeight: 160,
    },
    listeningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
    },
    listeningDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: theme.colors.error,
    },
    listeningLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.error,
    },
    liveText: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
      fontWeight: '500',
    },
    transcriptInput: {
      minHeight: 130,
    },
    micWrap: {
      alignItems: 'center',
      gap: theme.spacing.s2,
      marginTop: theme.spacing.s5,
    },
    micButton: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 1,
      borderColor: theme.colors.borderGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micButtonActive: {
      backgroundColor: theme.colors.errorBg,
      borderColor: theme.colors.error,
    },
    micHint: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.s3,
      marginTop: theme.spacing.s5,
    },
    actionRedo: {
      flex: 1,
    },
    actionCreate: {
      flex: 2,
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
    deniedText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.s4,
    },
  });
