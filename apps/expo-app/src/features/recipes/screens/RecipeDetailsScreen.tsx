import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Clock3, ShoppingBasket, Utensils, Users, Pencil, Trash2 } from 'lucide-react-native';
import {
  Screen,
  Shimmer,
  IconStatRow,
  ConfirmSheet,
  ToastBanner,
  useBottomBarActions,
  ModalSheet,
  useGlobalToast,
} from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { routes } from '@/src/core/navigation/routes';
import { useAddRecipeToShoppingList, useRecipeDetails } from '@/src/features/recipes/hooks';
import {
  RecipeIngredientRow,
  RecipeStepRow,
  RecipeSheetLayout,
  RecipeDetailsTabs,
  type RecipeDetailsTab,
  RecipePickerSheet,
} from '@/src/features/recipes/ui';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { formatDuration } from '@/src/features/recipes/utils/formatDuration';
import { RECIPE_PORTIONS_OPTIONS } from '@/src/features/recipes/constants/recipePickerOptions';

export function RecipeDetailsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    id?: string;
    toast?: string;
    returnPlanId?: string;
    returnEntryId?: string;
    returnDay?: string;
  }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const toastParam = typeof params.toast === 'string' ? params.toast : null;
  const returnPlanId = typeof params.returnPlanId === 'string' ? params.returnPlanId : null;
  const returnEntryId = typeof params.returnEntryId === 'string' ? params.returnEntryId : null;
  const returnDay = typeof params.returnDay === 'string' ? params.returnDay : null;

  const view = useRecipeDetails(id);
  const { state, actions } = view;
  const [tab, setTab] = useState<RecipeDetailsTab>('ingredients');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const [stepText, setStepText] = useState('');
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [titleOpen, setTitleOpen] = useState(false);
  const [addListOpen, setAddListOpen] = useState(false);
  const [addListPortions, setAddListPortions] = useState('');
  const { toast, show, clear } = useToastState();
  const { showError, showValidationError, toast: globalToast } = useGlobalToast();
  const { isAdding: isAddingToList, addRecipeToShoppingList } = useAddRecipeToShoppingList();
  const didInitialFocusLoad = useRef(false);
  const isFocused = useIsFocused();

  const stats = useMemo(() => {
    const cookingMinutes = state.recipe?.cookingTimeMinutes;
    const timeLabel =
      cookingMinutes !== null && cookingMinutes !== undefined
        ? formatDuration(cookingMinutes)
        : '—';
    const ingredientCount = state.recipe?.ingredients?.length ?? 0;
    const categoryLabel = state.recipe?.category ?? '—';
    const portionsLabel =
      state.recipe?.portions !== null && state.recipe?.portions !== undefined
        ? `${state.recipe.portions} Portions`
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
  }, [state.recipe]);

  const portionsOptions = useMemo(() => {
    const base = RECIPE_PORTIONS_OPTIONS.filter((option) => option.value !== '0');
    const recipePortions = state.recipe?.portions ?? null;
    if (recipePortions && recipePortions > 0) {
      const value = String(recipePortions);
      if (!base.some((option) => option.value === value)) {
        return [...base, { label: value, value }].sort((a, b) => Number(a.value) - Number(b.value));
      }
    }
    return base;
  }, [state.recipe?.portions]);

  const onEdit = useCallback(() => {
    if (!id) return;
    router.push(routes.recipeEdit(id));
  }, [id]);

  const handleAddResult = useCallback(
    (result: Awaited<ReturnType<typeof addRecipeToShoppingList>>) => {
      if (result.ok) {
        show({ variant: 'success', message: 'Added to shopping list.' });
        return;
      }
      if (result.reason === 'no-ingredients') {
        show({ variant: 'info', message: 'No ingredients to add.' });
        return;
      }
      if (result.reason === 'error') {
        showError({ kind: 'unknown', message: result.message });
      }
    },
    [show, showError],
  );

  const onAddToShoppingList = useCallback(async () => {
    if (!state.recipe) return;
    const recipePortions = state.recipe.portions ?? null;
    if (recipePortions && recipePortions > 0) {
      setAddListPortions(String(recipePortions));
      setAddListOpen(true);
      return;
    }

    const result = await addRecipeToShoppingList(state.recipe, null);
    handleAddResult(result);
  }, [addRecipeToShoppingList, handleAddResult, state.recipe]);

  const parsePortions = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const confirmAddToList = useCallback(async () => {
    if (isAddingToList) return;
    const selected = parsePortions(addListPortions);
    if (!selected) {
      showValidationError('Pick a valid portions value.');
      return;
    }
    setAddListOpen(false);
    const result = await addRecipeToShoppingList(state.recipe, selected);
    handleAddResult(result);
  }, [
    addListPortions,
    addRecipeToShoppingList,
    handleAddResult,
    isAddingToList,
    showValidationError,
    state.recipe,
  ]);

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
        disabled: isAddingToList,
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
    [isAddingToList, onAddToShoppingList, onDelete, onEdit],
  );

  useBottomBarActions(isLeaving ? null : actionItems);

  const openStep = useCallback((text: string, index: number) => {
    setStepText(text);
    setStepIndex(index);
    setStepOpen(true);
  }, []);

  useEffect(() => {
    if (!toastParam || !isFocused) return;

    const timeoutId = setTimeout(() => {
      if (toastParam === 'saved') {
        show({ variant: 'success', message: 'Saved successfully' });
      }
      if (toastParam === 'shopping-list') {
        show({ variant: 'success', message: 'Added to shopping list' });
      }
      router.setParams({ toast: undefined });
    }, 80);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isFocused, show, toastParam]);

  useEffect(() => {
    if (!toast || !isFocused) {
      setShowToast(false);
      return undefined;
    }

    setShowToast(false);
    const timeoutId = setTimeout(() => setShowToast(true), 90);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isFocused, toast]);

  const doDelete = async () => {
    setIsLeaving(true);
    const ok = await actions.remove();
    if (ok) {
      router.replace(routes.recipesWithToast('deleted'));
      return;
    }
    setIsLeaving(false);
    showError({ kind: 'unknown', message: 'Delete failed. Please try again.' });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await actions.load();
    setRefreshing(false);
  }, [actions]);

  useFocusEffect(
    useCallback(() => {
      if (!didInitialFocusLoad.current) {
        didInitialFocusLoad.current = true;
        return;
      }
      void actions.load();
    }, [actions]),
  );

  const heroHeight = 320;

  const onBack = useCallback(() => {
    if (returnPlanId) {
      router.push(
        routes.weeklyPlanEdit(returnPlanId, returnEntryId ?? undefined, returnDay ?? undefined),
      );
      return;
    }
    router.replace(routes.recipes);
  }, [returnDay, returnEntryId, returnPlanId]);

  return (
    <Screen
      title={state.isLoading ? 'Recipe' : (state.recipe?.title ?? 'Recipe')}
      showBack
      onBack={onBack}
      showProfileIcon={false}
      onTitlePress={() => setTitleOpen(true)}
      scroll={false}
      contentStyle={styles.screenContent}
    >
      <View style={styles.root}>
        {toast && showToast && !globalToast ? (
          <View style={styles.toast}>
            <ToastBanner
              variant={toast.variant}
              title={toast.title}
              message={toast.message}
              onTimeout={clear}
            />
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
                {state.recipe?.imageUrl ? (
                  <Image source={{ uri: state.recipe.imageUrl }} style={styles.heroImage} />
                ) : (
                  <Shimmer height={heroHeight} borderRadius={0} />
                )}
                {state.recipe?.fromExternal ? (
                  <View style={styles.originBadge}>
                    <Text style={styles.originBadgeText}>Imported</Text>
                  </View>
                ) : null}
              </View>
            }
            heroHeight={heroHeight}
            sheetOverlap={15}
            heroHasImage={Boolean(state.recipe?.imageUrl)}
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

              {state.recipe?.description?.trim() ? (
                <Text style={[styles.summaryText, styles.summaryTextWide]}>
                  {state.recipe.description}
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
                  state.recipe?.ingredients?.length ? (
                    <View style={styles.list}>
                      {state.recipe.ingredients.map((ing, idx) => (
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
                ) : state.recipe?.steps?.length ? (
                  <View style={styles.list}>
                    {state.recipe.steps.map((step, idx) => (
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
        description={`You are deleting recipe ${state.recipe?.title ?? 'this recipe'}.`}
        confirmLabel={state.isDeleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
        onConfirm={doDelete}
        onCancel={() => setDeleteOpen(false)}
        disabled={state.isDeleting}
      />

      <RecipePickerSheet
        visible={addListOpen}
        title="Portions"
        value={addListPortions || '1'}
        options={portionsOptions}
        onChange={setAddListPortions}
        onClose={() => setAddListOpen(false)}
        onDone={confirmAddToList}
        doneLabel={isAddingToList ? 'Adding...' : 'Add Items'}
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
          <Text style={styles.titleSheetText}>{state.recipe?.title ?? 'Recipe'}</Text>
        </View>
      </ModalSheet>
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
      backgroundColor: theme.colors.bg,
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
    hero: {
      backgroundColor: theme.colors.bgLight,
    },
    heroImage: {
      width: '100%',
      height: 320,
    },
    originBadge: {
      position: 'absolute',
      top: theme.spacing.s4,
      right: theme.spacing.s4,
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
      borderRadius: 999,
      backgroundColor: 'rgba(227,243,230,0.8)',
      borderWidth: 2,
      borderColor: theme.colors.primaryDark,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    originBadgeText: {
      color: theme.colors.primaryDark,
      fontSize: 12,
      fontWeight: '700',
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
