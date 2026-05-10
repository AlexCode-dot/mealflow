import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DraggableFlatList from 'react-native-draggable-flatlist';
import {
  Button,
  ConfirmSheet,
  ErrorText,
  Screen,
  SectionEmpty,
  resolveBottomActionBarColor,
  useBottomBarActions,
} from '@/src/shared/ui';
import { useKeyboardOpen } from '@/src/shared/hooks/useKeyboardOpen';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import {
  useExtractionReview,
  useRecipeEditorUiState,
  useRecipeImagePicker,
  useRecipeIngredientEditor,
  useRecipeStepEditor,
  useStepReorderState,
} from '@/src/features/recipes/hooks';
import {
  RecipeAddButton,
  RecipeHero,
  RecipeSheetLayout,
  createRecipeEditorRenderers,
  RecipeEditorBasics,
  RecipeEditorListSection,
  RecipeEditorPickers,
  RecipeEditorShell,
  IngredientEditorSheet,
  StepEditorSheet,
  VideoThumbnailPickerSheet,
} from '@/src/features/recipes/ui';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { ChevronRight, Download, Film, Info, Plus, XCircle } from 'lucide-react-native';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { routes } from '@/src/core/navigation/routes';

export function ImportReviewScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{
    jobId?: string;
    videoUri?: string;
    videoDurationMs?: string;
  }>();
  const jobId = typeof params.jobId === 'string' ? params.jobId : undefined;
  const videoUri = typeof params.videoUri === 'string' && params.videoUri ? params.videoUri : null;
  const videoDurationMs =
    typeof params.videoDurationMs === 'string' && params.videoDurationMs
      ? Number(params.videoDurationMs)
      : null;
  const review = useExtractionReview(jobId);
  const editorState = useRecipeEditorUiState();
  const isKeyboardOpen = useKeyboardOpen();
  const actionColor = resolveBottomActionBarColor(theme);

  const ingredientEditor = useRecipeIngredientEditor({
    ingredients: review.ingredients,
    setIngredients: review.setIngredients,
  });
  const stepEditor = useRecipeStepEditor({
    steps: review.steps,
    setSteps: review.setSteps,
  });
  const { items: stepItems, onDragEnd: onStepsDragEnd } = useStepReorderState({
    steps: review.steps,
    setSteps: review.setSteps,
  });

  const recipeScrollRef = useRef<Animated.ScrollView | null>(null);
  const titleInputRef = useRef<TextInput | null>(null);
  const descriptionInputRef = useRef<TextInput | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showRemoveImage, setShowRemoveImage] = useState(false);

  const { pickImage, isUploading } = useRecipeImagePicker({
    setImageUrl: review.form.setImageUrl,
    setImageFileId: review.form.setImageFileId,
  });

  // Keep a stable submit callback so `useBottomBarActions` doesn't loop.
  // The hook returns a fresh `review` object on every render (form state, etc.),
  // so we read the latest `submit` through a ref instead of depending on `review`.
  const reviewSubmitRef = useRef(review.submit);
  useEffect(() => {
    reviewSubmitRef.current = review.submit;
  }, [review.submit]);

  const isSaving = review.state.isSaving;
  const canSubmit = review.state.canSubmit;
  const reviewServerError = review.state.serverError;
  const heroImageUrl = review.form.imageUrl;
  const isVideoSource = review.state.job?.sourceType === 'VIDEO';
  const canPickFromVideo = isVideoSource && Boolean(videoUri);

  const [framePickerOpen, setFramePickerOpen] = useState(false);
  const [framePickerError, setFramePickerError] = useState<string | null>(null);
  const [isUploadingFrame, setIsUploadingFrame] = useState(false);

  const onPickedFrame = useCallback(
    async (frameUri: string, _timeMs: number) => {
      if (!frameUri) return;
      setFramePickerError(null);
      setIsUploadingFrame(true);
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: frameUri,
          name: `frame-${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as unknown as Blob);
        const response = await recipesApi.uploadImage(formData);
        review.form.setImageUrl(response.imageUrl);
        review.form.setImageFileId(response.imageFileId);
        setFramePickerOpen(false);
      } catch {
        setFramePickerError('Could not upload that frame. Try again.');
      } finally {
        setIsUploadingFrame(false);
      }
    },
    [review.form],
  );

  const submit = useCallback(async () => {
    setServerError(null);
    const id = await reviewSubmitRef.current();
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
    review.form.setImageUrl('');
    review.form.setImageFileId('');
    setShowRemoveImage(false);
  }, [review.form]);

  const actionItems = useMemo(
    () => [
      {
        key: 'cancel',
        label: 'Cancel',
        icon: <XCircle color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />,
        onPress: onCancel,
      },
      {
        key: 'save',
        label:
          isUploading || isUploadingFrame ? 'Uploading…' : isSaving ? 'Saving…' : 'Save recipe',
        icon: <Download color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />,
        onPress: submit,
        disabled: !canSubmit || isUploading || isUploadingFrame,
      },
    ],
    [actionColor, canSubmit, isSaving, isUploading, isUploadingFrame, onCancel, submit],
  );

  useBottomBarActions(actionItems);

  useEffect(() => {
    if (reviewServerError) setServerError(reviewServerError);
  }, [reviewServerError]);

  const titleError = review.form.touched.title ? review.form.errors.title : null;
  const descriptionError = review.form.touched.description ? review.form.errors.description : null;

  const scrollToFocusedField = useCallback(
    (inputRef: React.RefObject<TextInput | null>, keyboardOffset: number) => {
      requestAnimationFrame(() => {
        const node =
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

  const stickyAdd = useMemo(() => {
    if (editorState.tab === 'ingredients' && review.ingredients.length) {
      return { label: 'Add ingredient', onPress: ingredientEditor.openAdd };
    }
    if (editorState.tab === 'steps' && review.steps.length) {
      return { label: 'Add step', onPress: stepEditor.openAdd };
    }
    return null;
  }, [
    editorState.tab,
    ingredientEditor.openAdd,
    review.ingredients.length,
    review.steps.length,
    stepEditor.openAdd,
  ]);

  if (review.state.isLoading) {
    return (
      <Screen title="Review recipe" showBack onBack={() => router.back()} scroll={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primaryDark} />
          <Text style={styles.mutedText}>Loading extraction…</Text>
        </View>
      </Screen>
    );
  }

  if (review.state.loadError) {
    return (
      <Screen title="Review recipe" showBack onBack={() => router.back()} scroll>
        <View style={styles.errorBlock}>
          <ErrorText>{review.state.loadError}</ErrorText>
          <Button title="Retry" variant="secondary" onPress={review.reload} />
          <Button title="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const heroHeight = 300;

  return (
    <Screen
      title="Review recipe"
      showBack
      onBack={() => router.back()}
      scroll={false}
      contentStyle={styles.screenContent}
    >
      <View style={styles.root}>
        <RecipeSheetLayout
          scrollRef={recipeScrollRef}
          hero={
            <RecipeHero
              imageUrl={heroImageUrl}
              onPress={pickImage}
              onRemove={heroImageUrl ? onRemoveImage : undefined}
              isUploading={isUploading}
            />
          }
          heroHeight={heroHeight}
          sheetOverlap={63}
          heroHasImage={Boolean(heroImageUrl)}
        >
          {review.state.uncertainFields.length > 0 ? (
            <View style={styles.reviewHint}>
              <Info color={theme.colors.primaryDark} size={14} strokeWidth={2.5} />
              <Text style={styles.reviewHintText} numberOfLines={1}>
                Review the details before saving.
              </Text>
            </View>
          ) : null}

          {canPickFromVideo ? (
            <View style={styles.framePickerBlock}>
              <Pressable
                onPress={() => setFramePickerOpen(true)}
                disabled={isUploadingFrame}
                style={({ pressed }) => [
                  styles.framePickerCard,
                  pressed ? styles.framePickerCardPressed : null,
                  isUploadingFrame ? styles.framePickerCardDisabled : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  heroImageUrl ? 'Change cover frame' : 'Pick a frame from your video'
                }
              >
                <View style={styles.framePickerIcon}>
                  {isUploadingFrame ? (
                    <ActivityIndicator color={theme.colors.primaryDark} size="small" />
                  ) : (
                    <Film color={theme.colors.primaryDark} size={18} strokeWidth={2.25} />
                  )}
                </View>
                <View style={styles.framePickerTextBlock}>
                  <Text style={styles.framePickerLabel}>
                    {isUploadingFrame
                      ? 'Uploading frame…'
                      : heroImageUrl
                        ? 'Change cover frame'
                        : 'Use a frame as cover'}
                  </Text>
                  <Text style={styles.framePickerHint}>From your video</Text>
                </View>
                {!isUploadingFrame ? (
                  <ChevronRight color={theme.colors.primaryDark} size={20} strokeWidth={2.5} />
                ) : null}
              </Pressable>
              {framePickerError ? (
                <Text style={styles.framePickerError}>{framePickerError}</Text>
              ) : null}
            </View>
          ) : null}

          {serverError ? <ErrorText>{serverError}</ErrorText> : null}

          <RecipeEditorShell tab={editorState.tab} onTabChange={editorState.setTab}>
            {editorState.tab === 'basic' ? (
              <RecipeEditorBasics
                title={review.form.title}
                onTitleChange={(v) => review.form.setTitle(v)}
                titleInputRef={titleInputRef}
                onTitleFocus={() => scrollToFocusedField(titleInputRef, 8)}
                onTitleBlur={() => review.form.setTouched((t) => ({ ...t, title: true }))}
                titleError={titleError}
                description={review.form.description}
                onDescriptionChange={(v) => review.form.setDescription(v)}
                descriptionInputRef={descriptionInputRef}
                onDescriptionFocus={() => scrollToFocusedField(descriptionInputRef, 96)}
                onDescriptionBlur={() =>
                  review.form.setTouched((t) => ({ ...t, description: true }))
                }
                descriptionError={descriptionError}
                time={review.form.time}
                portions={review.form.portions}
                category={review.form.category}
                onOpenPicker={editorState.setPickerOpen}
              />
            ) : null}

            {editorState.tab === 'ingredients' ? (
              <RecipeEditorListSection
                itemsCount={review.ingredients.length}
                list={
                  <DraggableFlatList
                    data={review.ingredients}
                    keyExtractor={(item, index) => item.id ?? `${item.name}-${index}`}
                    renderItem={renderIngredientItem}
                    onDragEnd={({ data: nextData }) => review.setIngredients(nextData)}
                    activationDistance={8}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
                  />
                }
                empty={
                  <SectionEmpty
                    title="No ingredients"
                    description="Nothing was extracted. Add ingredients manually."
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
                itemsCount={review.steps.length}
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
                    title="No steps"
                    description="Nothing was extracted. Add steps manually."
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
        title="Remove photo?"
        description="This will remove the photo from your imported recipe."
        confirmLabel="Remove"
        confirmVariant="danger"
        onCancel={() => setShowRemoveImage(false)}
        onConfirm={confirmRemoveImage}
      />

      <VideoThumbnailPickerSheet
        visible={framePickerOpen}
        videoUri={videoUri}
        durationMs={videoDurationMs}
        onCancel={() => setFramePickerOpen(false)}
        onPicked={onPickedFrame}
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
        time={review.form.time}
        portions={review.form.portions}
        category={review.form.category}
        onTimeChange={review.form.setTime}
        onPortionsChange={review.form.setPortions}
        onCategoryChange={review.form.setCategory}
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
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.s2,
    },
    errorBlock: {
      gap: theme.spacing.s3,
      paddingTop: theme.spacing.s4,
    },
    mutedText: {
      color: theme.colors.textMuted,
      fontSize: 14,
    },
    reviewHint: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.s2,
      paddingVertical: theme.spacing.s2,
      marginHorizontal: theme.spacing.s4,
      marginBottom: theme.spacing.s2,
    },
    reviewHintText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    listSeparator: {
      height: theme.spacing.s2,
    },
    framePickerBlock: {
      gap: theme.spacing.s2,
      marginHorizontal: theme.spacing.s4,
      marginBottom: theme.spacing.s4,
    },
    framePickerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
      paddingLeft: theme.spacing.s2,
      paddingRight: theme.spacing.s3,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
    },
    framePickerCardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.995 }],
    },
    framePickerCardDisabled: {
      opacity: 0.7,
    },
    framePickerIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    framePickerTextBlock: {
      flex: 1,
      gap: 1,
    },
    framePickerLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    framePickerHint: {
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    framePickerError: {
      color: theme.colors.error,
      fontSize: 13,
    },
    stickyAdd: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: TAB_BAR.BOX_HEIGHT + TAB_BAR.PADDING_TOP - 42,
      alignItems: 'center',
    },
  });
