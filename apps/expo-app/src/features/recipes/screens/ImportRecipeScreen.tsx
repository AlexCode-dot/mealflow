import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { routes } from '@/src/core/navigation/routes';
import { Image as ImageIcon, Video as VideoIcon, RefreshCw } from 'lucide-react-native';
import { Button, ErrorText, Screen } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { useRecipeExtraction } from '@/src/features/recipes/hooks';

const PHASE_LABEL: Record<string, string> = {
  uploading: 'Uploading…',
  processing: 'Reading the recipe…',
};

export function ImportRecipeScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { state, actions } = useRecipeExtraction();

  // Auto-navigate to the review screen as soon as extraction is ready.
  useEffect(() => {
    if (state.phase === 'ready' && state.job?.jobId) {
      router.replace(
        routes.recipeImportReview(
          state.job.jobId,
          state.videoUri ?? undefined,
          state.videoDurationMs ?? undefined,
        ),
      );
    }
  }, [state.phase, state.job?.jobId, state.videoUri, state.videoDurationMs]);

  const inProgress = state.phase === 'uploading' || state.phase === 'processing';

  return (
    <Screen title="Import recipe" showBack onBack={() => router.back()} scroll>
      <View style={styles.intro}>
        <Text style={styles.title}>Import a recipe from media</Text>
        <Text style={styles.body}>
          Pick a screenshot, photo or short cooking video and we&apos;ll try to extract the recipe
          for you. You can review and edit everything before saving.
        </Text>
      </View>

      {state.phase === 'idle' || state.phase === 'failed' ? (
        <View style={styles.actions}>
          <Button
            title="Pick image"
            variant="primary"
            onPress={actions.startFromImage}
            containerStyle={styles.button}
          />
          <Button
            title="Pick video"
            variant="secondary"
            onPress={actions.startFromVideo}
            containerStyle={styles.button}
          />
        </View>
      ) : null}

      {inProgress ? (
        <View style={styles.progress}>
          <ActivityIndicator color={theme.colors.primaryDark} size="large" />
          <Text style={styles.progressLabel}>{PHASE_LABEL[state.phase] ?? 'Working on it…'}</Text>
          <Text style={styles.progressBody}>
            This usually takes 5–30 seconds. Don&apos;t close the app.
          </Text>
        </View>
      ) : null}

      {state.phase === 'failed' ? (
        <View style={styles.failed}>
          <ErrorText>{state.error ?? 'Something went wrong.'}</ErrorText>
          <Button
            title="Try again"
            variant="secondary"
            onPress={actions.reset}
            containerStyle={styles.button}
          />
        </View>
      ) : null}

      <View style={styles.tipBlock}>
        <Text style={styles.tipTitle}>Tips for best results</Text>
        <View style={styles.tipRow}>
          <ImageIcon
            color={theme.colors.textMuted}
            size={16}
            strokeWidth={2}
            style={styles.tipIcon}
          />
          <Text style={styles.tipText}>
            Photos: aim for a clear, readable view of the whole recipe.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <VideoIcon
            color={theme.colors.textMuted}
            size={16}
            strokeWidth={2}
            style={styles.tipIcon}
          />
          <Text style={styles.tipText}>
            Videos: max 100 MB and ~5 minutes. On-screen ingredient text helps a lot.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <RefreshCw
            color={theme.colors.textMuted}
            size={16}
            strokeWidth={2}
            style={styles.tipIcon}
          />
          <Text style={styles.tipText}>
            Quantities are sometimes missing in TikToks — review and fill them in before saving.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    intro: {
      gap: theme.spacing.s2,
      marginBottom: theme.spacing.s4,
    },
    title: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '900',
    },
    body: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      gap: theme.spacing.s2,
      marginBottom: theme.spacing.s5,
    },
    button: {
      width: '100%',
    },
    progress: {
      alignItems: 'center',
      paddingVertical: theme.spacing.s5,
      gap: theme.spacing.s2,
    },
    progressLabel: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    progressBody: {
      color: theme.colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    failed: {
      gap: theme.spacing.s2,
      marginBottom: theme.spacing.s5,
    },
    tipBlock: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderNeutral,
      paddingTop: theme.spacing.s4,
      gap: theme.spacing.s2,
    },
    tipTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.s2,
    },
    tipIcon: {
      marginTop: 2,
    },
    tipText: {
      flex: 1,
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
