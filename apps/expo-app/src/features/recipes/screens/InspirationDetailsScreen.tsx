import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bookmark, MapPin, ShoppingBasket, Utensils } from 'lucide-react-native';
import {
  IconStatRow,
  ModalSheet,
  Screen,
  Shimmer,
  ToastBanner,
  useBottomBarActions,
  useGlobalToast,
  resolveBottomActionBarColor,
} from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { useInspirationDetails, useRecipesList } from '@/src/features/recipes/hooks';
import {
  RecipeDetailsTabs,
  RecipeIngredientRow,
  RecipePickerSheet,
  RecipeSheetLayout,
  RecipeStepRow,
  type RecipeDetailsTab,
} from '@/src/features/recipes/ui';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { getRecipeCategoryOptions } from '@/src/features/recipes/constants/recipePickerOptions';
import { routes } from '@/src/core/navigation/routes';
import { normalizePath } from '@/src/core/navigation/normalizePath';
import { buildHref } from '@/src/core/navigation/buildHref';

export function InspirationDetailsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const returnTo = normalizePath(typeof params.returnTo === 'string' ? params.returnTo : null);
  const view = useInspirationDetails(id);
  const { state, actions } = view;
  const saved = useRecipesList();
  const [tab, setTab] = useState<RecipeDetailsTab>('ingredients');
  const [mealType, setMealType] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const [stepText, setStepText] = useState('');
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [titleOpen, setTitleOpen] = useState(false);
  const { toast, clear } = useToastState();
  const { toast: globalToast, showApiError, showValidationError } = useGlobalToast();

  const openStep = useCallback((text: string, index: number) => {
    setStepText(text);
    setStepIndex(index);
    setStepOpen(true);
  }, []);

  useEffect(() => {
    if (state.saveError) {
      showApiError({ kind: 'unknown', message: state.saveError }, 'Save failed');
    }
  }, [showApiError, state.saveError]);

  const onSave = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const onSaveWithCategory = useCallback(async () => {
    if (!mealType) {
      showValidationError(t('recipes.chooseCategory'));
      return;
    }

    setPickerOpen(false);
    const created = await actions.save({ mealType });
    if (created) {
      router.replace(
        buildHref(routes.recipeView(created.id, 'saved'), { returnTo: returnTo ?? undefined }),
      );
    }
  }, [mealType, actions, returnTo, showValidationError]);

  const actionColor = resolveBottomActionBarColor(theme);
  const actionItems = useMemo(
    () => [
      {
        key: 'save',
        label: state.isSaving ? t('recipes.savingRecipe') : t('recipes.saveRecipe'),
        icon: <Bookmark color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.3} />,
        onPress: onSave,
        disabled: state.isSaving || !state.recipe,
      },
    ],
    [actionColor, state.isSaving, onSave, state.recipe],
  );

  useBottomBarActions(actionItems);

  const stats = useMemo(() => {
    const ingredientCount = state.recipe?.ingredients?.length ?? 0;
    const categoryLabel = state.recipe?.category ?? '—';
    const areaLabel = state.recipe?.area ?? '—';

    return [
      {
        icon: <ShoppingBasket color={theme.colors.primaryDark} size={32} strokeWidth={2.4} />,
        label: String(ingredientCount),
      },
      {
        icon: <Utensils color={theme.colors.primaryDark} size={32} strokeWidth={2.4} />,
        label: categoryLabel,
      },
      {
        icon: <MapPin color={theme.colors.primaryDark} size={32} strokeWidth={2.4} />,
        label: areaLabel,
      },
    ];
  }, [state.recipe, theme.colors.primaryDark]);

  const isSaved = useMemo(() => {
    const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
    const key = `${normalize(state.recipe?.title)}|${normalize(state.recipe?.imageUrl)}`;
    if (!key.trim()) return false;
    return saved.items.some((item) => {
      if (!item.fromExternal) return false;
      return `${normalize(item.title)}|${normalize(item.imageUrl)}` === key;
    });
  }, [state.recipe?.imageUrl, state.recipe?.title, saved.items]);

  const steps = useMemo(() => {
    return (state.recipe?.steps ?? []).filter((step) => !isStepMarker(step));
  }, [state.recipe]);

  const heroHeight = 320;

  return (
    <Screen
      title={state.isLoading ? t('recipes.inspiration') : (state.recipe?.title ?? t('recipes.inspiration'))}
      showBack
      showProfileIcon={false}
      onBack={() => {
        if (returnTo) {
          router.replace(buildHref(returnTo));
          return;
        }
        router.back();
      }}
      onTitlePress={() => setTitleOpen(true)}
      scroll={false}
      contentStyle={styles.screenContent}
    >
      <View style={styles.root}>
        {toast && !globalToast ? (
          <View style={styles.toast}>
            <ToastBanner
              variant={toast.variant}
              title={toast.title}
              message={toast.message}
              onTimeout={clear}
            />
          </View>
        ) : null}

        {state.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primaryDark} />
          </View>
        ) : (
          <RecipeSheetLayout
            hero={
              <View style={styles.hero}>
                {state.recipe?.imageUrl ? (
                  <Image source={{ uri: state.recipe.imageUrl }} style={styles.heroImage} />
                ) : (
                  <Shimmer height={heroHeight} borderRadius={0} />
                )}
                {isSaved ? (
                  <View style={styles.savedBadge}>
                    <Text style={styles.savedBadgeText}>{t('recipes.saved')}</Text>
                  </View>
                ) : null}
              </View>
            }
            heroHeight={heroHeight}
            sheetOverlap={15}
            heroHasImage={Boolean(state.recipe?.imageUrl)}
          >
            <View style={styles.summary}>
              <IconStatRow items={stats} labelStyle={styles.statLabel} rowStyle={styles.statRow} />

              <View style={styles.tabs}>
                <RecipeDetailsTabs value={tab} onChange={setTab} />
              </View>

              <View style={styles.list}>
                {tab === 'ingredients'
                  ? state.recipe?.ingredients.map((item, index) => (
                      <RecipeIngredientRow
                        key={`${index}-${item.name}`}
                        name={item.name}
                        unit={item.measure ?? undefined}
                      />
                    ))
                  : steps.map((step, index) => (
                      <RecipeStepRow
                        key={`${index}-${step}`}
                        index={index + 1}
                        text={step}
                        maxLines={2}
                        showDisclosure
                        onPress={() => openStep(step, index + 1)}
                      />
                    ))}
              </View>
            </View>
          </RecipeSheetLayout>
        )}

        <RecipePickerSheet
          visible={pickerOpen}
          title={t('recipes.mealType')}
          value={mealType}
          options={getRecipeCategoryOptions(t)}
          onChange={setMealType}
          onClose={() => setPickerOpen(false)}
          onDone={onSaveWithCategory}
        />

        <ModalSheet visible={stepOpen} onClose={() => setStepOpen(false)}>
          <View style={styles.stepSheet}>
            <Text style={styles.stepTitle}>{stepIndex ? t('recipes.stepLabel', { n: stepIndex }) : t('recipes.step')}</Text>
            <View style={styles.stepBody}>
              {splitStepParagraphs(stepText).map((paragraph, index) => (
                <View key={`${index}-${paragraph}`} style={styles.stepParagraphRow}>
                  <Text style={styles.stepBullet}>•</Text>
                  <Text style={styles.stepParagraph}>{paragraph}</Text>
                </View>
              ))}
            </View>
          </View>
        </ModalSheet>

        <ModalSheet visible={titleOpen} onClose={() => setTitleOpen(false)}>
          <View style={styles.titleSheet}>
            <Text style={styles.titleSheetHeading}>{t('recipes.recipeTitle')}</Text>
            <Text style={styles.titleSheetText}>{state.recipe?.title ?? t('recipes.inspiration')}</Text>
          </View>
        </ModalSheet>
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screenContent: {
      padding: 0,
      gap: 0,
    },
    root: {
      flex: 1,
    },
    toast: {
      position: 'absolute',
      top: -theme.spacing.s6 - theme.spacing.s4,
      left: theme.spacing.s3,
      right: theme.spacing.s3,
      zIndex: 5,
    },
    loading: {
      padding: theme.spacing.s6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroImage: {
      width: '100%',
      height: 320,
    },
    hero: {
      position: 'relative',
    },
    savedBadge: {
      position: 'absolute',
      top: theme.spacing.s4,
      right: theme.spacing.s4,
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
      borderRadius: 999,
      backgroundColor: 'rgba(227,243,230,0.92)',
      borderWidth: 2,
      borderColor: theme.colors.primaryDark,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    savedBadgeText: {
      color: theme.colors.primaryDark,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    summary: {
      paddingTop: theme.spacing.s3,
      paddingHorizontal: theme.spacing.s3,
      paddingBottom: theme.spacing.s6,
      gap: theme.spacing.s3,
    },
    statRow: {
      marginTop: theme.spacing.s2,
    },
    statLabel: {
      fontSize: 12,
    },
    tabs: {
      marginTop: theme.spacing.s2,
    },
    list: {
      gap: theme.spacing.s3,
    },
    stepSheet: {
      gap: theme.spacing.s2,
      paddingBottom: theme.spacing.s4,
      minHeight: 260,
      paddingHorizontal: theme.spacing.s4,
    },
    stepTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.s1,
    },
    stepBody: {
      marginTop: theme.spacing.s2,
    },
    stepParagraph: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
      marginBottom: theme.spacing.s2,
    },
    stepParagraphRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.s2,
      marginBottom: theme.spacing.s2,
    },
    stepBullet: {
      fontSize: 18,
      lineHeight: 24,
      color: theme.colors.text,
      marginTop: 1,
    },
    titleSheet: {
      paddingHorizontal: theme.spacing.s4,
      paddingTop: theme.spacing.s4,
      paddingBottom: theme.spacing.s6,
      gap: theme.spacing.s2,
    },
    titleSheetHeading: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    titleSheetText: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 28,
    },
  });

function isStepMarker(step: string): boolean {
  return /^(step\\s*\\d+|\\d+[\\).:]?)$/i.test(step.trim());
}

function splitStepParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = extractSentences(trimmed);
  if (parts.length > 1) return parts;
  return splitByLength(trimmed, 140);
}

function extractSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) return [];
  return matches.map((part) => part.trim()).filter(Boolean);
}

function splitByLength(text: string, maxLen: number): string[] {
  const words = text.split(/\\s+/).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';

  for (const word of words) {
    if ((buffer + ' ' + word).trim().length <= maxLen) {
      buffer = buffer ? `${buffer} ${word}` : word;
      continue;
    }
    if (buffer) {
      chunks.push(buffer);
    }
    buffer = word;
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks;
}
