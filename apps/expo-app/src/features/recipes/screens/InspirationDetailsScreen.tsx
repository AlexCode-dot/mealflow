import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Bookmark, MapPin, ShoppingBasket, Utensils } from 'lucide-react-native';
import {
  Button,
  ErrorText,
  IconStatRow,
  ModalSheet,
  Screen,
  Shimmer,
  ToastBanner,
  useBottomBarActions,
} from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
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
import { RECIPE_CATEGORY_OPTIONS } from '@/src/features/recipes/constants/recipePickerOptions';

export function InspirationDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { recipe, isLoading, error, load, save, isSaving, saveError } = useInspirationDetails(id);
  const saved = useRecipesList();
  const [tab, setTab] = useState<RecipeDetailsTab>('ingredients');
  const [mealType, setMealType] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const [stepText, setStepText] = useState('');
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [titleOpen, setTitleOpen] = useState(false);
  const { toast, show, clear } = useToastState();

  const openStep = useCallback((text: string, index: number) => {
    setStepText(text);
    setStepIndex(index);
    setStepOpen(true);
  }, []);

  useEffect(() => {
    if (saveError) {
      show({ variant: 'error', title: 'Save failed', message: saveError });
    }
  }, [saveError, show]);

  const onSave = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const onSaveWithCategory = useCallback(async () => {
    if (!mealType) {
      show({ variant: 'error', message: 'Choose a category before saving.' });
      return;
    }

    setPickerOpen(false);
    const created = await save({ mealType });
    if (created) {
      router.replace({ pathname: '/recipes/[id]', params: { id: created.id, toast: 'saved' } });
    }
  }, [mealType, save, show]);

  const actionItems = useMemo(
    () => [
      {
        key: 'save',
        label: isSaving ? 'Saving…' : 'Save recipe',
        icon: (
          <Bookmark color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.3} />
        ),
        onPress: onSave,
        disabled: isSaving || !recipe,
      },
    ],
    [isSaving, onSave, recipe],
  );

  useBottomBarActions(actionItems);

  const stats = useMemo(() => {
    const ingredientCount = recipe?.ingredients?.length ?? 0;
    const categoryLabel = recipe?.category ?? '—';
    const areaLabel = recipe?.area ?? '—';

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
  }, [recipe]);

  const isSaved = useMemo(() => {
    const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();
    const key = `${normalize(recipe?.title)}|${normalize(recipe?.imageUrl)}`;
    if (!key.trim()) return false;
    return saved.items.some((item) => {
      if (!item.fromExternal) return false;
      return `${normalize(item.title)}|${normalize(item.imageUrl)}` === key;
    });
  }, [recipe?.imageUrl, recipe?.title, saved.items]);

  const steps = useMemo(() => {
    return (recipe?.steps ?? []).filter((step) => !isStepMarker(step));
  }, [recipe]);

  const heroHeight = 320;

  return (
    <Screen
      title={isLoading ? 'Inspiration' : (recipe?.title ?? 'Inspiration')}
      showBack
      showProfileIcon={false}
      onTitlePress={() => setTitleOpen(true)}
      scroll={false}
      contentStyle={styles.screenContent}
    >
      <View style={styles.root}>
        {toast ? (
          <View style={styles.toast}>
            <ToastBanner
              variant={toast.variant}
              title={toast.title}
              message={toast.message}
              onTimeout={clear}
            />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <ErrorText>{error}</ErrorText>
            <View style={styles.errorSpacer} />
            <Button title="Try again" onPress={load} />
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primaryDark} />
          </View>
        ) : (
          <RecipeSheetLayout
            hero={
              <View style={styles.hero}>
                {recipe?.imageUrl ? (
                  <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} />
                ) : (
                  <Shimmer height={heroHeight} borderRadius={0} />
                )}
                {isSaved ? (
                  <View style={styles.savedBadge}>
                    <Text style={styles.savedBadgeText}>Saved</Text>
                  </View>
                ) : null}
              </View>
            }
            heroHeight={heroHeight}
            sheetOverlap={15}
            heroHasImage={Boolean(recipe?.imageUrl)}
          >
            <View style={styles.summary}>
              <IconStatRow items={stats} labelStyle={styles.statLabel} rowStyle={styles.statRow} />

              <View style={styles.tabs}>
                <RecipeDetailsTabs value={tab} onChange={setTab} />
              </View>

              <View style={styles.list}>
                {tab === 'ingredients'
                  ? recipe?.ingredients.map((item, index) => (
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
          title="Meal type"
          value={mealType}
          options={RECIPE_CATEGORY_OPTIONS}
          onChange={setMealType}
          onClose={() => setPickerOpen(false)}
          onDone={onSaveWithCategory}
        />

        <ModalSheet visible={stepOpen} onClose={() => setStepOpen(false)}>
          <View style={styles.stepSheet}>
            <Text style={styles.stepTitle}>{stepIndex ? `Step ${stepIndex}` : 'Step'}</Text>
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
            <Text style={styles.titleSheetHeading}>Recipe title</Text>
            <Text style={styles.titleSheetText}>{recipe?.title ?? 'Inspiration'}</Text>
          </View>
        </ModalSheet>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  errorCard: {
    margin: theme.spacing.s4,
    padding: theme.spacing.s4,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
  },
  errorSpacer: {
    height: theme.spacing.s3,
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
