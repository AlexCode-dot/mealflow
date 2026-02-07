import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import DraggableFlatList from 'react-native-draggable-flatlist';
import {
  Screen,
  ErrorText,
  SectionEmpty,
  useBottomBarActions,
  ConfirmSheet,
} from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import {
  useEditRecipe,
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

export function EditRecipeScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const view = useEditRecipe(id);
  const { state, form, data, actions } = view;
  const { pickImage, isUploading } = useRecipeImagePicker({
    setImageUrl: form.setImageUrl,
    setImageFileId: form.setImageFileId,
    recipeId: id,
  });
  const [showRemoveImage, setShowRemoveImage] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const editorState = useRecipeEditorUiState();

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
  const { items: stepItems, onDragEnd: onStepsDragEnd } = useStepReorderState({
    steps: stepRows,
    setSteps: data.setSteps,
  });

  const saveRef = useRef(actions.save);
  useEffect(() => {
    saveRef.current = actions.save;
  }, [actions.save]);

  const onSave = useCallback(async () => {
    const ok = await saveRef.current();
    if (ok && id) {
      router.navigate(routes.recipeView(id, 'saved'));
      return;
    }
    if (ok) router.back();
  }, [id]);

  const onCancel = useCallback(() => {
    router.back();
  }, []);

  const onRemoveImage = useCallback(() => {
    setShowRemoveImage(true);
  }, []);

  const confirmRemoveImage = useCallback(async () => {
    const ok = await actions.removeImage();
    if (ok) {
      setShowRemoveImage(false);
    }
  }, [actions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await actions.load();
    setRefreshing(false);
  }, [actions]);

  const heroHeight = 300;
  const titleError = form.touched.title ? form.errors.title : null;
  const descriptionError = form.touched.description ? form.errors.description : null;

  const { renderIngredientItem, renderStepItem } = createRecipeEditorRenderers({
    onEditIngredient: ingredientEditor.openEdit,
    onEditStep: stepEditor.openEdit,
  });

  const actionItems = useMemo(
    () => [
      {
        key: 'cancel',
        label: 'Cancel',
        icon: (
          <XCircle color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />
        ),
        onPress: onCancel,
      },
      {
        key: 'save',
        label:
          isUploading || state.isRemovingImage
            ? 'Updating…'
            : state.isSaving
              ? 'Saving…'
              : 'Save recipe',
        icon: (
          <Download
            color={theme.colors.textOnPrimary}
            size={TAB_BAR.ICON_SIZE}
            strokeWidth={2.25}
          />
        ),
        onPress: onSave,
        disabled: !state.canSave || isUploading || state.isRemovingImage,
      },
    ],
    [state.canSave, state.isSaving, state.isRemovingImage, onCancel, onSave, isUploading],
  );

  useBottomBarActions(actionItems);

  const stickyAdd = useMemo(() => {
    if (editorState.tab === 'ingredients' && ingredientRows.length) {
      return { label: 'Add ingredient', onPress: ingredientEditor.openAdd };
    }
    if (editorState.tab === 'steps' && stepRows.length) {
      return { label: 'Add step', onPress: stepEditor.openAdd };
    }
    return null;
  }, [
    editorState.tab,
    ingredientEditor.openAdd,
    ingredientRows.length,
    stepEditor.openAdd,
    stepRows.length,
  ]);

  return (
    <Screen title="Edit Recipe" showBack scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.root}>
        <RecipeSheetLayout
          hero={
            <RecipeHero
              imageUrl={form.imageUrl}
              onPress={pickImage}
              onRemove={form.imageUrl ? onRemoveImage : undefined}
              isUploading={isUploading || state.isRemovingImage}
            />
          }
          heroHeight={heroHeight}
          heroHasImage={Boolean(form.imageUrl)}
          refreshing={refreshing}
          onRefresh={onRefresh}
        >
          <RecipeEditorShell tab={editorState.tab} onTabChange={editorState.setTab}>
            {state.loadError ? <ErrorText>{state.loadError}</ErrorText> : null}
            {state.saveError ? <ErrorText>{state.saveError}</ErrorText> : null}

            {editorState.tab === 'basic' ? (
              <RecipeEditorBasics
                title={form.title}
                onTitleChange={(v) => form.setTitle(v)}
                onTitleBlur={() => form.setTouched((prev) => ({ ...prev, title: true }))}
                titleError={titleError}
                description={form.description}
                onDescriptionChange={(v) => form.setDescription(v)}
                onDescriptionBlur={() =>
                  form.setTouched((prev) => ({ ...prev, description: true }))
                }
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
                    title="No ingredients yet"
                    description="Add your first ingredient to start building your recipe."
                    actionLabel="Add ingredient"
                    onAction={ingredientEditor.openAdd}
                    actionIcon={
                      <Plus color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
                    }
                  />
                }
                addLabel="Add ingredient"
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
                    title="No steps yet"
                    description="Add your first step to start building your recipe."
                    actionLabel="Add step"
                    onAction={stepEditor.openAdd}
                    actionIcon={
                      <Plus color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
                    }
                  />
                }
                addLabel="Add step"
                onAdd={stepEditor.openAdd}
                showInlineAdd={false}
              />
            ) : null}
          </RecipeEditorShell>
        </RecipeSheetLayout>

        {stickyAdd ? (
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
        title="Remove photo?"
        description="This will remove the photo from your recipe."
        confirmLabel="Remove"
        confirmVariant="danger"
        onCancel={() => setShowRemoveImage(false)}
        onConfirm={confirmRemoveImage}
        disabled={state.isRemovingImage}
      />

      <IngredientEditorSheet
        visible={ingredientEditor.isOpen}
        title={ingredientEditor.editingIndex === null ? 'Add Ingredient' : 'Edit Ingredient'}
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
        title={stepEditor.editingIndex === null ? 'Add step' : 'Edit step'}
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
