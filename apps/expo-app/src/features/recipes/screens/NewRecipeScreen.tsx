import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Screen, ErrorText, SectionEmpty, useBottomBarActions } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';
import {
  useCreateRecipe,
  useRecipeEditorUiState,
  useRecipeIngredientEditor,
  useRecipeStepEditor,
  useStepReorderState,
} from '@/src/features/recipes/hooks';
import {
  RecipeHero,
  IngredientEditorSheet,
  StepEditorSheet,
  createRecipeEditorRenderers,
  RecipeSheetLayout,
  RecipeEditorBasics,
  RecipeEditorListSection,
  RecipeEditorShell,
  RecipeEditorPickers,
} from '@/src/features/recipes/ui';
import { Plus, Download, XCircle } from 'lucide-react-native';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';

export function NewRecipeScreen() {
  const form = useCreateRecipe();
  const editorState = useRecipeEditorUiState();

  const ingredientRows = useMemo(() => form.ingredients ?? [], [form.ingredients]);
  const stepRows = useMemo(() => form.steps ?? [], [form.steps]);
  const ingredientEditor = useRecipeIngredientEditor({
    ingredients: ingredientRows,
    setIngredients: form.setIngredients,
  });
  const stepEditor = useRecipeStepEditor({
    steps: stepRows,
    setSteps: form.setSteps,
  });
  const { items: stepItems, onDragEnd: onStepsDragEnd } = useStepReorderState({
    steps: stepRows,
    setSteps: form.setSteps,
  });

  const submitRef = useRef(form.submit);
  useEffect(() => {
    submitRef.current = form.submit;
  }, [form.submit]);

  const submit = useCallback(async () => {
    const id = await submitRef.current();
    if (id) router.replace(`${routes.recipe(id)}?toast=saved`);
  }, []);

  const onCancel = useCallback(() => {
    router.back();
  }, []);

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
        label: form.isSaving ? 'Saving…' : 'Save recipe',
        icon: (
          <Download
            color={theme.colors.textOnPrimary}
            size={TAB_BAR.ICON_SIZE}
            strokeWidth={2.25}
          />
        ),
        onPress: submit,
        disabled: !form.canSubmit,
      },
    ],
    [form.canSubmit, form.isSaving, onCancel, submit],
  );

  useBottomBarActions(actionItems);

  return (
    <Screen title="Add Recipe" showBack scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.root}>
        <RecipeSheetLayout hero={<RecipeHero imageUrl={form.imageUrl} />} heroHeight={heroHeight}>
          <RecipeEditorShell tab={editorState.tab} onTabChange={editorState.setTab}>
            {form.serverError ? <ErrorText>{form.serverError}</ErrorText> : null}
            {editorState.tab === 'basic' ? (
              <RecipeEditorBasics
                title={form.title}
                onTitleChange={(v) => form.setTitle(v)}
                onTitleBlur={() => form.setTouched((t) => ({ ...t, title: true }))}
                titleError={titleError}
                description={form.description}
                onDescriptionChange={(v) => form.setDescription(v)}
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
                    onDragEnd={({ data }) => form.setIngredients(data)}
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
              />
            ) : null}
          </RecipeEditorShell>
        </RecipeSheetLayout>
      </View>

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

const styles = StyleSheet.create({
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
});
