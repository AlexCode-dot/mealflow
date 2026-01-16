import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, InteractionManager, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Clock3, ShoppingBasket, Utensils, Users, Pencil, Trash2 } from 'lucide-react-native';
import {
  Screen,
  ErrorText,
  Button,
  Shimmer,
  IconStatRow,
  ConfirmSheet,
  ToastBanner,
  useBottomBarActions,
  ModalSheet,
} from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';
import { useRecipeDetails } from '@/src/features/recipes/hooks';
import {
  RecipeIngredientRow,
  RecipeStepRow,
  RecipeSheetLayout,
  RecipeDetailsTabs,
  type RecipeDetailsTab,
} from '@/src/features/recipes/ui';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { formatDuration } from '@/src/features/recipes/utils/formatDuration';

export function RecipeDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string; toast?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const toastParam = typeof params.toast === 'string' ? params.toast : null;

  const { recipe, isLoading, error, load, remove, isDeleting } = useRecipeDetails(id);
  const [tab, setTab] = useState<RecipeDetailsTab>('ingredients');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const [stepText, setStepText] = useState('');
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const { toast, show, clear } = useToastState();
  const didInitialFocusLoad = useRef(false);
  const isFocused = useIsFocused();

  const stats = useMemo(() => {
    const cookingMinutes = recipe?.cookingTimeMinutes;
    const timeLabel =
      cookingMinutes !== null && cookingMinutes !== undefined
        ? formatDuration(cookingMinutes)
        : '—';
    const ingredientCount = recipe?.ingredients?.length ?? 0;
    const categoryLabel = recipe?.category ?? '—';
    const portionsLabel =
      recipe?.portions !== null && recipe?.portions !== undefined
        ? `${recipe.portions} Portions`
        : '—';

    return [
      {
        icon: <Clock3 color={theme.colors.primaryDark} size={34} strokeWidth={2.4} />,
        label: timeLabel,
      },
      {
        icon: <ShoppingBasket color={theme.colors.primaryDark} size={34} strokeWidth={2.4} />,
        label: String(ingredientCount),
      },
      {
        icon: <Utensils color={theme.colors.primaryDark} size={34} strokeWidth={2.4} />,
        label: categoryLabel,
      },
      {
        icon: <Users color={theme.colors.primaryDark} size={34} strokeWidth={2.4} />,
        label: portionsLabel,
      },
    ];
  }, [recipe]);

  const onEdit = useCallback(() => {
    if (!id) return;
    router.push(routes.recipeEdit(id));
  }, [id]);

  const onAddToShoppingList = useCallback(() => {
    show({ variant: 'success', message: 'Added to shopping list' });
  }, [show]);

  const onDelete = useCallback(() => {
    setDeleteOpen(true);
  }, []);

  const actionItems = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        icon: (
          <Pencil color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />
        ),
        onPress: onEdit,
      },
      {
        key: 'shopping-list',
        label: 'Add to Shopping List',
        icon: (
          <ShoppingBasket
            color={theme.colors.textOnPrimary}
            size={TAB_BAR.ICON_SIZE}
            strokeWidth={2.25}
          />
        ),
        onPress: onAddToShoppingList,
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: (
          <Trash2 color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />
        ),
        onPress: onDelete,
      },
    ],
    [onAddToShoppingList, onDelete, onEdit],
  );

  useBottomBarActions(isLeaving ? null : actionItems);

  const openStep = useCallback((text: string, index: number) => {
    setStepText(text);
    setStepIndex(index);
    setStepOpen(true);
  }, []);

  useEffect(() => {
    if (!toastParam || !isFocused) return;

    const task = InteractionManager.runAfterInteractions(() => {
      if (toastParam === 'saved') {
        show({ variant: 'success', message: 'Saved successfully' });
      }
      if (toastParam === 'shopping-list') {
        show({ variant: 'success', message: 'Added to shopping list' });
      }
      router.setParams({ toast: undefined });
    });

    return () => {
      task.cancel?.();
    };
  }, [isFocused, show, toastParam]);

  useEffect(() => {
    if (!toast || !isFocused) {
      setShowToast(false);
      return undefined;
    }

    setShowToast(false);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => setShowToast(true), 90);
    });

    return () => {
      task.cancel?.();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isFocused, toast]);

  const doDelete = async () => {
    setIsLeaving(true);
    const ok = await remove();
    if (ok) {
      router.replace(`${routes.recipes}?toast=deleted`);
      return;
    }
    setIsLeaving(false);
    show({
      variant: 'error',
      title: 'Delete failed',
      message: 'Please try again.',
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!didInitialFocusLoad.current) {
        didInitialFocusLoad.current = true;
        return;
      }
      load();
    }, [load]),
  );

  const heroHeight = 320;

  const onBack = useCallback(() => {
    router.replace(routes.recipes);
  }, []);

  return (
    <Screen
      title={isLoading ? 'Recipe' : (recipe?.title ?? 'Recipe')}
      showBack
      onBack={onBack}
      showProfileIcon={false}
      scroll={false}
      contentStyle={styles.screenContent}
    >
      <View style={styles.root}>
        {toast && showToast ? (
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

        {isLeaving ? (
          <View style={styles.leaving}>
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
              </View>
            }
            heroHeight={heroHeight}
            sheetOverlap={15}
            refreshing={refreshing}
            onRefresh={onRefresh}
          >
            <View style={styles.summary}>
              <IconStatRow
                items={stats}
                labelStyle={styles.statLabel}
                iconWrapStyle={styles.statIcon}
                rowStyle={styles.statRow}
              />

              {recipe?.description?.trim() ? (
                <Text style={[styles.summaryText, styles.summaryTextWide]}>
                  {recipe.description}
                </Text>
              ) : (
                <Text style={[styles.summaryText, styles.summaryTextWide, styles.summaryEmpty]}>
                  No description yet
                </Text>
              )}
            </View>

            <View style={styles.panel}>
              <View style={styles.panelTabs}>
                <RecipeDetailsTabs value={tab} onChange={setTab} />
              </View>

              <View style={styles.panelContent}>
                {tab === 'ingredients' ? (
                  recipe?.ingredients?.length ? (
                    <View style={styles.list}>
                      {recipe.ingredients.map((ing, idx) => (
                        <RecipeIngredientRow
                          key={`${ing.name}-${idx}`}
                          name={ing.name}
                          quantity={ing.quantity}
                          unit={ing.unit}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No ingredients yet</Text>
                  )
                ) : recipe?.steps?.length ? (
                  <View style={styles.list}>
                    {recipe.steps.map((step, idx) => (
                      <RecipeStepRow
                        key={`${idx}-${step.slice(0, 12)}`}
                        index={idx + 1}
                        text={step}
                        maxLines={2}
                        showDisclosure
                        onPress={() => openStep(step, idx + 1)}
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No steps yet</Text>
                )}
              </View>
            </View>
          </RecipeSheetLayout>
        )}
      </View>

      <ConfirmSheet
        visible={deleteOpen}
        title="Delete recipe?"
        description={`You are deleting recipe ${recipe?.title ?? 'this recipe'}.`}
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
        onConfirm={doDelete}
        onCancel={() => setDeleteOpen(false)}
        disabled={isDeleting}
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
    backgroundColor: theme.colors.bg,
  },
  errorCard: {
    margin: theme.spacing.s4,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.radius.md,
    padding: theme.spacing.s4,
    gap: theme.spacing.s3,
  },
  toast: {
    position: 'absolute',
    top: -theme.spacing.s6 - theme.spacing.s4,
    left: theme.spacing.s3,
    right: theme.spacing.s3,
    zIndex: 20,
  },
  leaving: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorSpacer: {
    height: theme.spacing.s3,
  },
  hero: {
    backgroundColor: theme.colors.bgLight,
  },
  heroImage: {
    width: '100%',
    height: 320,
  },
  summary: {
    padding: theme.spacing.s4,
    paddingTop: theme.spacing.s6,
    gap: theme.spacing.s5,
  },
  summaryText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryTextWide: {
    marginHorizontal: -theme.spacing.s2,
  },
  summaryEmpty: {
    color: theme.colors.textMuted,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  statIcon: {
    minHeight: 38,
    justifyContent: 'center',
  },
  statRow: {
    justifyContent: 'center',
    gap: theme.spacing.s6 + 14,
  },
  panel: {
    backgroundColor: theme.colors.bg,
  },
  panelTabs: {
    paddingTop: 20,
  },
  panelContent: {
    padding: theme.spacing.s4,
    paddingTop: theme.spacing.s3,
    paddingBottom: theme.spacing.s4,
    gap: theme.spacing.s3,
  },
  list: {
    gap: theme.spacing.s2,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  stepParagraphRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.s2,
    marginBottom: theme.spacing.s2,
  },
  stepParagraph: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  stepBullet: {
    fontSize: 18,
    lineHeight: 24,
    color: theme.colors.text,
    marginTop: 1,
  },
});

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
  const words = text.split(/\s+/).filter(Boolean);
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
