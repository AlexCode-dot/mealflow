import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DraggableFlatList from 'react-native-draggable-flatlist';
import {
  Screen,
  ErrorText,
  SectionEmpty,
  useBottomBarActions,
  resolveBottomActionBarColor,
  ConfirmSheet,
} from '@/src/shared/ui';
import { useKeyboardOpen } from '@/src/shared/hooks/useKeyboardOpen';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import {
  useCreateRecipe,
  useRecipeImagePicker,
  useRecipeEditorUiState,
  useRecipeIngredientEditor,
  useRecipeStepEditor,
  useStepReorderState,
} from '@/src/features/recipes/hooks';
import {
  RecipeHero,
  IngredientEditorSheet,
  StepEditorSheet,
  RecipeAddButton,
  createRecipeEditorRenderers,
  RecipeSheetLayout,
  RecipeEditorBasics,
  RecipeEditorListSection,
  RecipeEditorShell,
  RecipeEditorPickers,
} from '@/src/features/recipes/ui';
import { Plus, Download, XCircle } from 'lucide-react-native';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { routes } from '@/src/core/navigation/routes';
import { normalizePath } from '@/src/core/navigation/normalizePath';
import { buildHref } from '@/src/core/navigation/buildHref';

export function NewRecipeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = normalizePath(typeof params.returnTo === 'string' ? params.returnTo : null);
  const view = useCreateRecipe();
  const { state, form, data, actions } = view;
  const editorState = useRecipeEditorUiState();
  const [showRemoveImage, setShowRemoveImage] = useState(false);
  const isKeyboardOpen = useKeyboardOpen();
  const { pickImage, isUploading } = useRecipeImagePicker({
    setImageUrl: form.setImageUrl,
    setImageFileId: form.setImageFileId,
  });

  const ingredientRows = useMemo(() => data.ingredients ?? [], [data.ingredients]);
  const stepRows = useMemo(() => data.steps ?? [], [data.steps]);
  const ingredientEditor = useRecipeIngredientEditor({
    ingredients: ingredientRows,
    setIngredients: data.setIngredients,
  });
  const stepEditor = useRecipeStepEditor({
    steps: stepRows,
    setSteps: data.setSteps,
  });
  const recipeScrollRef = useRef<Animated.ScrollView | null>(null);
  const titleInputRef = useRef<TextInput | null>(null);
  const descriptionInputRef = useRef<TextInput | null>(null);
  const { items: stepItems, onDragEnd: onStepsDragEnd } = useStepReorderState({
    steps: stepRows,
    setSteps: data.setSteps,
  });
  const actionColor = resolveBottomActionBarColor(theme);

  const submitRef = useRef(actions.submit);
  useEffect(() => {
    submitRef.current = actions.submit;
  }, [actions.submit]);

  const submit = useCallback(async () => {
    const id = await submitRef.current();
    if (id) {
      router.replace(routes.recipeView(id, 'saved'));
    }
  }, []);

  const onCancel = useCallback(() => {
    router.back();
  }, []);

  const onRemoveImage = useCallback(() => {
    setShowRemoveImage(true);
  }, []);

  const confirmRemoveImage = useCallback(() => {
    form.setImageUrl('');
    form.setImageFileId('');
    setShowRemoveImage(false);
  }, [form]);

  const heroHeight = 300;
  const titleError = form.touched.title ? form.errors.title : null;
  const descriptionError = form.touched.description ? form.errors.description : null;
  const scrollToFocusedField = useCallback(
    (inputRef: React.RefObject<TextInput | null>, keyboardOffset: number) => {
      requestAnimationFrame(() => {
        const node =
          // Animated.ScrollView can expose getNode() depending on RN internals.
          (recipeScrollRef.current as any)?.getNode?.() ?? (recipeScrollRef.current as any);
        const responder = node?.getScrollResponder?.();
        if (!responder || !inputRef.current) return;
        responder.scrollResponderScrollNativeHandleToKeyboard(
          inputRef.current,
          keyboardOffset,
          true,
        );
      });
    },
    [],
  );

  const { renderIngredientItem, renderStepItem } = createRecipeEditorRenderers({
    onEditIngredient: ingredientEditor.openEdit,
    onEditStep: stepEditor.openEdit,
  });

  const actionItems = useMemo(
    () => [
      {
        key: 'cancel',
        label: t('common.cancel'),
        icon: <XCircle color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />,
        onPress: onCancel,
      },
      {
        key: 'save',
        label: isUploading ? t('recipes.uploadingRecipe') : state.isSaving ? t('recipes.savingRecipe') : t('recipes.saveRecipe'),
        icon: <Download color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />,
        onPress: submit,
        disabled: !state.canSubmit || isUploading,
      },
    ],
    [actionColor, isUploading, state.canSubmit, state.isSaving, onCancel, submit],
  );

  useBottomBarActions(actionItems);

  const stickyAdd = useMemo(() => {
    if (editorState.tab === 'ingredients' && ingredientRows.length) {
      return { label: t('recipes.addIngredient'), onPress: ingredientEditor.openAdd };
    }
    if (editorState.tab === 'steps' && stepRows.length) {
      return { label: t('recipes.addStep'), onPress: stepEditor.openAdd };
    }
    return null;
  }, [t,
    editorState.tab,
    ingredientEditor.openAdd,
    ingredientRows.length,
    stepEditor.openAdd,
    stepRows.length,
  ]);

  return (
    <Screen
      title={t('recipes.addRecipe')}
      showBack
      onBack={() => {
        if (returnTo) {
          router.replace(buildHref(returnTo));
          return;
        }
        router.back();
      }}
      scroll={false}
      contentStyle={styles.screenContent}
    >
      <View style={styles.root}>
        <RecipeSheetLayout
          scrollRef={recipeScrollRef}
          hero={
            <RecipeHero
              imageUrl={form.imageUrl}
              onPress={pickImage}
              onRemove={form.imageUrl ? onRemoveImage : undefined}
              isUploading={isUploading}
            />
          }
          heroHeight={heroHeight}
          sheetOverlap={63}
          heroHasImage={Boolean(form.imageUrl)}
        >
          <RecipeEditorShell tab={editorState.tab} onTabChange={editorState.setTab}>
            {state.serverError ? <ErrorText>{state.serverError}</ErrorText> : null}
            {editorState.tab === 'basic' ? (
              <RecipeEditorBasics
                title={form.title}
                onTitleChange={(v) => form.setTitle(v)}
                titleInputRef={titleInputRef}
                onTitleFocus={() => {
                  scrollToFocusedField(titleInputRef, 8);
                }}
                onTitleBlur={() => form.setTouched((t) => ({ ...t, title: true }))}
                titleError={titleError}
                description={form.description}
                onDescriptionChange={(v) => form.setDescription(v)}
                descriptionInputRef={descriptionInputRef}
                onDescriptionFocus={() => {
                  scrollToFocusedField(descriptionInputRef, 96);
                }}
                onDescriptionBlur={() => form.setTouched((t) => ({ ...t, description: true }))}
                descriptionError={descriptionError}
                time={form.time}
                portions={form.portions}
                category={form.category}
                onOpenPicker={editorState.setPickerOpen}
              />
            ) : null}

            {editorState.tab === 'ingredients' ? (
              <RecipeEditorListSection
                itemsCount={ingredientRows.length}
                list={
                  <DraggableFlatList
                    data={ingredientRows}
                    keyExtractor={(item, index) => item.id ?? `${item.name}-${index}`}
                    renderItem={renderIngredientItem}
                    onDragEnd={({ data: nextData }) => data.setIngredients(nextData)}
                    activationDistance={8}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
                  />
                }
                empty={
                  <SectionEmpty
                    title={t('recipes.noIngredientsYet')}
                    description={t('recipes.noIngredientsAddFirst')}
                    actionLabel={t('recipes.addIngredient')}
                    onAction={ingredientEditor.openAdd}
                    actionIcon={
                      <Plus color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
                    }
                  />
                }
                addLabel={t('recipes.addIngredient')}
                onAdd={ingredientEditor.openAdd}
                showInlineAdd={false}
              />
            ) : null}

            {editorState.tab === 'steps' ? (
              <RecipeEditorListSection
                itemsCount={stepRows.length}
                list={
                  <DraggableFlatList
                    data={stepItems}
                    keyExtractor={(item, index) => `${item.id ?? index}`}
                    renderItem={renderStepItem}
                    onDragEnd={({ data }) => onStepsDragEnd(data)}
                    activationDistance={8}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
                  />
                }
                empty={
                  <SectionEmpty
                    title={t('recipes.noStepsYet')}
                    description={t('recipes.noStepsAddFirst')}
                    actionLabel={t('recipes.addStep')}
                    onAction={stepEditor.openAdd}
                    actionIcon={
                      <Plus color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
                    }
                  />
                }
                addLabel={t('recipes.addStep')}
                onAdd={stepEditor.openAdd}
                showInlineAdd={false}
              />
            ) : null}
          </RecipeEditorShell>
        </RecipeSheetLayout>

        {stickyAdd && !isKeyboardOpen ? (
          <View style={styles.stickyAdd}>
            <RecipeAddButton
              label={stickyAdd.label}
              onPress={stickyAdd.onPress}
              compact
              variant="solid"
            />
          </View>
        ) : null}
      </View>

      <ConfirmSheet
        visible={showRemoveImage}
        title={t('recipes.removePhotoTitle')}
        description={t('recipes.removePhotoBody')}
        confirmLabel={t('recipes.remove')}
        confirmVariant="danger"
        onCancel={() => setShowRemoveImage(false)}
        onConfirm={confirmRemoveImage}
      />

      <IngredientEditorSheet
        visible={ingredientEditor.isOpen}
        title={ingredientEditor.editingIndex === null ? t('recipes.addIngredientTitle') : t('recipes.editIngredientTitle')}
        name={ingredientEditor.draft.name}
        unit={ingredientEditor.draft.unit}
        amount={ingredientEditor.draft.amount}
        onChangeName={ingredientEditor.setName}
        onChangeUnit={ingredientEditor.setUnit}
        onChangeAmount={ingredientEditor.setAmount}
        nameError={ingredientEditor.errors.name}
        unitError={ingredientEditor.errors.unit}
        amountError={ingredientEditor.errors.amount}
        onSave={ingredientEditor.save}
        onCancel={ingredientEditor.close}
        onDelete={ingredientEditor.editingIndex === null ? undefined : ingredientEditor.remove}
      />

      <StepEditorSheet
        visible={stepEditor.isOpen}
        title={stepEditor.editingIndex === null ? t('recipes.addStepTitle') : t('recipes.editStepTitle')}
        description={stepEditor.draft}
        onChangeDescription={stepEditor.setDescription}
        error={stepEditor.error}
        onSave={stepEditor.save}
        onCancel={stepEditor.close}
        onDelete={stepEditor.editingIndex === null ? undefined : stepEditor.remove}
      />

      <RecipeEditorPickers
        pickerOpen={editorState.pickerOpen}
        time={form.time}
        portions={form.portions}
        category={form.category}
        onTimeChange={form.setTime}
        onPortionsChange={form.setPortions}
        onCategoryChange={form.setCategory}
        onClose={() => editorState.setPickerOpen(null)}
      />
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
    listSeparator: {
      height: theme.spacing.s2,
    },
    stickyAdd: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: TAB_BAR.BOX_HEIGHT + TAB_BAR.PADDING_TOP - 42,
      alignItems: 'center',
    },
  });
