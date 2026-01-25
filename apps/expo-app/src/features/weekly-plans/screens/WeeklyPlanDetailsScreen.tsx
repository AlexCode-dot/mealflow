import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Check, CalendarDays, GripVertical, List, Plus, Users, X } from 'lucide-react-native';
import { RECIPE_PORTIONS_OPTIONS } from '@/src/features/recipes/constants/recipePickerOptions';
import { RecipeActionBar } from '@/src/features/recipes/ui/RecipeActionBar';
import { RecipeSelectField } from '@/src/features/recipes/ui/RecipeSelectField';
import { WeeklyPlanDayPicker } from '@/src/features/weekly-plans/ui/WeeklyPlanDayPicker';
import { WeeklyPlanEntryCard } from '@/src/features/weekly-plans/ui/WeeklyPlanEntryCard';
import { AddMealRecipeCard } from '@/src/features/weekly-plans/ui/AddMealRecipeCard';
import {
  useWeeklyPlanDetailsScreen,
  type AddTabKey,
} from '@/src/features/weekly-plans/hooks/useWeeklyPlanDetailsScreen';
import {
  BottomActionBar,
  Card,
  Chip,
  ConfirmSheet,
  FormSheet,
  LoadingScreen,
  PickerSelect,
  PickerSheetOverlay,
  SearchField,
  Screen,
  SectionEmpty,
  SegmentedTabs,
  TextField,
  ToastBanner,
  useGlobalToast,
} from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { SECTION_DRAFT_ID } from '@/src/features/weekly-plans/constants/weeklyPlanDefaults';

export default function WeeklyPlanDetailScreen() {
  const view = useWeeklyPlanDetailsScreen();
  const { state, actions, toast, dayPicker, data, addSheet, editSheet, sectionSheet, confirms } =
    view;
  const { toast: globalToast } = useGlobalToast();

  const {
    editPickerOpen,
    setEditPickerOpen,
    editDay,
    setEditDay,
    editSection,
    setEditSection,
    editPortions,
    setEditPortions,
    editDayOptions,
  } = editSheet;

  const editPickerOverlay = useMemo(() => {
    if (!editPickerOpen) return null;

    const close = () => setEditPickerOpen(null);

    if (editPickerOpen === 'day') {
      return (
        <View style={styles.pickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <PickerSheetOverlay title="Day" onClose={close} onDone={close}>
            <PickerSelect
              value={editDay}
              onChange={setEditDay}
              options={editDayOptions.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
            />
          </PickerSheetOverlay>
        </View>
      );
    }

    if (editPickerOpen === 'section') {
      return (
        <View style={styles.pickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <PickerSheetOverlay title="Section" onClose={close} onDone={close}>
            <PickerSelect
              value={editSection}
              onChange={setEditSection}
              options={data.sectionOptions.map((section) => ({ label: section, value: section }))}
            />
          </PickerSheetOverlay>
        </View>
      );
    }

    return (
      <View style={styles.pickerOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <PickerSheetOverlay title="Portions" onClose={close} onDone={close}>
          <PickerSelect
            value={editPortions}
            onChange={setEditPortions}
            options={RECIPE_PORTIONS_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
          />
        </PickerSheetOverlay>
      </View>
    );
  }, [
    data.sectionOptions,
    editDay,
    editDayOptions,
    editPickerOpen,
    editPortions,
    editSection,
    setEditDay,
    setEditPickerOpen,
    setEditPortions,
    setEditSection,
  ]);
  const toastBanner =
    toast.state.toast && toast.showToast && !globalToast ? (
      <View style={styles.toastOverlay} pointerEvents="box-none">
        <View style={[styles.toastWrap, { marginTop: toast.topInset + 8 }]} pointerEvents="none">
          <ToastBanner
            variant={toast.state.toast.variant}
            title={toast.state.toast.title}
            message={toast.state.toast.message}
            onTimeout={toast.state.clear}
          />
        </View>
      </View>
    ) : null;

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.root}>
      <Screen
        title={state.title}
        scroll
        showBack
        onBack={actions.handleBack}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
        }
        contentStyle={styles.screenContent}
      >
        <View style={[styles.contentWrap, { paddingBottom: state.contentPaddingBottom }]}>
          {state.plan ? (
            <WeeklyPlanDayPicker
              days={dayPicker.dayTabs}
              activeDay={dayPicker.activeDay}
              todayKey={dayPicker.todayKey}
              onSelect={dayPicker.setActiveDay}
            />
          ) : null}

          {data.planSections.map((section) => {
            const sectionEntries = data.entriesForDay.filter(
              (entry) => entry.section.trim().toLowerCase() === section.toLowerCase(),
            );
            return (
              <Card key={section} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.toUpperCase()}</Text>
                  <Pressable
                    onPress={() => actions.openAddSheet(section)}
                    style={({ pressed }) => [styles.addButton, pressed ? styles.addPressed : null]}
                  >
                    <Plus size={18} color={theme.colors.textOnPrimary} strokeWidth={2.4} />
                  </Pressable>
                </View>

                {sectionEntries.length === 0 ? (
                  <SectionEmpty
                    title="No meals yet"
                    description="Add your first meal to start building your plan."
                    actionLabel="Add meal"
                    onAction={() => actions.openAddSheet(section)}
                    actionIcon={
                      <Plus size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />
                    }
                  />
                ) : (
                  <View style={styles.entryList}>
                    {sectionEntries.map((entry) => {
                      const recipe = entry.recipeId ? data.recipesById.get(entry.recipeId) : null;
                      return (
                        <WeeklyPlanEntryCard
                          key={entry.id}
                          entry={entry}
                          recipe={recipe}
                          onPress={() => actions.openEditSheet(entry)}
                        />
                      );
                    })}
                  </View>
                )}
              </Card>
            );
          })}

          <FormSheet
            visible={addSheet.open}
            onClose={() => addSheet.setOpen(false)}
            title="Add Meal"
            footer={
              <View style={styles.sheetFooter}>
                {addSheet.formError ? (
                  <Text style={styles.formError}>{addSheet.formError}</Text>
                ) : null}
                <RecipeActionBar
                  onCancel={() => addSheet.setOpen(false)}
                  onSave={addSheet.handleSaveEntry}
                  saveLabel={state.isSaving ? 'Saving...' : 'Add Meal'}
                  disabled={state.isSaving}
                />
              </View>
            }
            footerFullBleed
          >
            <ScrollView
              style={[styles.sheetScroll, { maxHeight: Math.min(460, state.screenHeight * 0.52) }]}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sheetSubtitle}>
                {addSheet.sheetDayLabel ? `${addSheet.sheetDayLabel} · ` : ''}
                {addSheet.addSection}
              </Text>

              <SegmentedTabs
                tabs={[
                  { key: 'recipes', label: 'Recipes' },
                  { key: 'custom', label: 'Custom meal' },
                ]}
                value={addSheet.tab}
                onChange={(key) => addSheet.setTab(key as AddTabKey)}
              />

              {addSheet.tab === 'recipes' ? (
                <View style={styles.sheetBlock}>
                  <SearchField
                    value={addSheet.recipeSearch}
                    onChangeText={addSheet.setRecipeSearch}
                    placeholder="Search for recipes..."
                    variant="rounded"
                  />

                  {data.filteredRecipes.length === 0 ? (
                    <Text style={styles.sheetHint}>
                      {data.recipes.length === 0
                        ? 'No recipes yet. Create one first.'
                        : 'No recipes found.'}
                    </Text>
                  ) : (
                    <View style={styles.recipeList}>
                      {data.filteredRecipes.map((recipe) => (
                        <AddMealRecipeCard
                          key={recipe.id}
                          recipe={recipe}
                          selected={recipe.id === addSheet.selectedRecipeId}
                          onPress={() => addSheet.handleSelectRecipe(recipe)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.sheetBlock}>
                  <TextField
                    label="Title"
                    value={addSheet.customTitle}
                    onChangeText={addSheet.setCustomTitle}
                    placeholder="Meal name..."
                  />

                  <TextField
                    label="Items"
                    value={addSheet.itemInput}
                    onChangeText={addSheet.setItemInput}
                    placeholder="Add an item and press enter..."
                    returnKeyType="done"
                    onSubmitEditing={addSheet.handleAddItem}
                  />
                  {addSheet.items.length ? (
                    <View style={styles.extrasList}>
                      {addSheet.items.map((item, idx) => (
                        <View key={`${item}-${idx}`} style={styles.extrasRow}>
                          <View style={styles.extrasLeft}>
                            <View style={styles.extrasCheck}>
                              <Check size={14} color={theme.colors.primaryDark} strokeWidth={2.6} />
                            </View>
                            <Text style={styles.extrasText}>{item}</Text>
                          </View>
                          <Pressable
                            onPress={() =>
                              addSheet.setItems((prev) => prev.filter((_, i) => i !== idx))
                            }
                            style={({ pressed }) => [
                              styles.extrasRemove,
                              pressed ? styles.extrasRemovePressed : null,
                            ]}
                          >
                            <X size={14} color={theme.colors.primaryDark} strokeWidth={2.6} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
            </ScrollView>
          </FormSheet>

          <FormSheet
            visible={editSheet.open}
            onClose={() => editSheet.setOpen(false)}
            title={
              editSheet.tab === 'recipes'
                ? (editSheet.editRecipe?.title ?? 'Meal')
                : editSheet.editTitle || 'Meal'
            }
            overlay={editPickerOverlay}
            footer={<BottomActionBar items={editSheet.actionItems} />}
            footerFullBleed
          >
            <ScrollView
              style={[styles.sheetScroll, { maxHeight: Math.min(520, state.screenHeight * 0.65) }]}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sheetSubtitle}>{editSheet.editSubtitle}</Text>

              {editSheet.tab === 'recipes' ? (
                <View style={styles.sheetBlock}>
                  <RecipeSelectField
                    icon={<Users color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
                    prefix="Port"
                    value={editSheet.editPortions || '0'}
                    onPress={() => editSheet.setEditPickerOpen('portions')}
                  />

                  <View style={styles.sheetRow}>
                    <View style={styles.sheetRowItem}>
                      <Text style={styles.sheetLabel}>Day</Text>
                      <RecipeSelectField
                        icon={
                          <CalendarDays
                            color={theme.colors.textMuted}
                            size={18}
                            strokeWidth={2.5}
                          />
                        }
                        value={editSheet.editDayLabel}
                        onPress={() => editSheet.setEditPickerOpen('day')}
                      />
                    </View>
                    <View style={styles.sheetRowItem}>
                      <Text style={styles.sheetLabel}>Section</Text>
                      <RecipeSelectField
                        icon={<List color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
                        value={editSheet.editSection}
                        onPress={() => editSheet.setEditPickerOpen('section')}
                      />
                    </View>
                  </View>

                  <TextField
                    label="Extra items"
                    value={editSheet.editExtraInput}
                    onChangeText={editSheet.setEditExtraInput}
                    placeholder="Add extra items to the meal..."
                    returnKeyType="done"
                    onSubmitEditing={editSheet.handleEditExtraAdd}
                  />
                  {editSheet.editExtraItems.length ? (
                    <View style={styles.extrasList}>
                      {editSheet.editExtraItems.map((item, idx) => (
                        <View key={`${item}-${idx}`} style={styles.extrasRow}>
                          <View style={styles.extrasLeft}>
                            <View style={styles.extrasCheck}>
                              <Check size={14} color={theme.colors.primaryDark} strokeWidth={2.6} />
                            </View>
                            <Text style={styles.extrasText}>{item}</Text>
                          </View>
                          <Pressable
                            onPress={() =>
                              editSheet.setEditExtraItems((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            style={({ pressed }) => [
                              styles.extrasRemove,
                              pressed ? styles.extrasRemovePressed : null,
                            ]}
                          >
                            <X size={14} color={theme.colors.primaryDark} strokeWidth={2.6} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.sheetBlock}>
                  <View style={styles.sheetRow}>
                    <View style={styles.sheetRowItem}>
                      <Text style={styles.sheetLabel}>Day</Text>
                      <RecipeSelectField
                        icon={
                          <CalendarDays
                            color={theme.colors.textMuted}
                            size={18}
                            strokeWidth={2.5}
                          />
                        }
                        value={editSheet.editDayLabel}
                        onPress={() => editSheet.setEditPickerOpen('day')}
                      />
                    </View>
                    <View style={styles.sheetRowItem}>
                      <Text style={styles.sheetLabel}>Section</Text>
                      <RecipeSelectField
                        icon={<List color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
                        value={editSheet.editSection}
                        onPress={() => editSheet.setEditPickerOpen('section')}
                      />
                    </View>
                  </View>

                  <TextField
                    label="Title"
                    value={editSheet.editTitle}
                    onChangeText={editSheet.setEditTitle}
                    placeholder="Meal name..."
                  />
                  <TextField
                    label="Items"
                    value={editSheet.editItemInput}
                    onChangeText={editSheet.setEditItemInput}
                    placeholder="Add an item and press enter..."
                    returnKeyType="done"
                    onSubmitEditing={editSheet.handleEditItemAdd}
                  />
                  {editSheet.editItems.length ? (
                    <View style={styles.itemRow}>
                      {editSheet.editItems.map((item, idx) => (
                        <Chip
                          key={`${item}-${idx}`}
                          label={item}
                          variant="recipes"
                          onPress={() =>
                            editSheet.setEditItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
            </ScrollView>
          </FormSheet>

          <FormSheet
            visible={sectionSheet.open}
            onClose={() => sectionSheet.setOpen(false)}
            title="Add Section"
            footer={<BottomActionBar items={sectionSheet.actionItems} />}
            footerFullBleed
          >
            <ScrollView
              style={[styles.sheetScroll, { maxHeight: Math.min(520, state.screenHeight * 0.6) }]}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TextField
                label="Title"
                value={sectionSheet.newSectionTitle}
                onChangeText={sectionSheet.setNewSectionTitle}
                placeholder="Section title..."
                returnKeyType="done"
                onSubmitEditing={sectionSheet.handleAddSectionDraft}
              />

              <View style={styles.sectionListHeader}>
                <Text style={styles.sectionListTitle}>Section List</Text>
                <View style={styles.sectionListDivider} />
              </View>

              <View style={styles.sectionList}>
                <DraggableFlatList
                  data={sectionSheet.sectionDraftWithPlaceholder}
                  keyExtractor={(item, index) =>
                    item === SECTION_DRAFT_ID ? `${SECTION_DRAFT_ID}-${index}` : item
                  }
                  onDragEnd={sectionSheet.handleSectionDragEnd}
                  activationDistance={8}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.sectionListSeparator} />}
                  renderItem={({ item, drag, isActive }: RenderItemParams<string>) => {
                    const isDraft = item === SECTION_DRAFT_ID;
                    const label = isDraft ? sectionSheet.newSectionTitle.trim() || '...' : item;
                    const selected =
                      !isDraft &&
                      sectionSheet.selectedSection?.toLowerCase() === item.toLowerCase();
                    return (
                      <Pressable
                        onPress={() => sectionSheet.handleSectionSelect(item)}
                        disabled={isActive}
                        style={[
                          styles.sectionListRow,
                          selected ? styles.sectionListRowActive : null,
                          isDraft ? styles.sectionListRowPlaceholder : null,
                        ]}
                      >
                        <Text style={styles.sectionListText}>{label.toUpperCase()}</Text>
                        <Pressable
                          onLongPress={drag}
                          disabled={isActive}
                          style={styles.sectionDragHandle}
                        >
                          <GripVertical color={theme.colors.primary} size={20} strokeWidth={2.4} />
                        </Pressable>
                      </Pressable>
                    );
                  }}
                />
              </View>
            </ScrollView>
          </FormSheet>

          <ConfirmSheet
            visible={confirms.entryDeleteOpen}
            title="Remove meal?"
            description={confirms.entryDeleteDescription}
            confirmLabel="Delete"
            onConfirm={confirms.confirmEntryDelete}
            onCancel={() => {
              confirms.setEntryDeleteOpen(false);
              if (editSheet.resumeEditOnCancel) {
                editSheet.setOpen(true);
                editSheet.setResumeEditOnCancel(false);
              }
            }}
            disabled={state.isSaving}
          />

          <ConfirmSheet
            visible={confirms.clearWeekOpen}
            title="Clear week?"
            description={confirms.clearWeekDescription}
            confirmLabel="Clear"
            onConfirm={confirms.confirmClearWeek}
            onCancel={() => confirms.setClearWeekOpen(false)}
            disabled={state.isSaving}
          />

          <ConfirmSheet
            visible={confirms.generateOpen}
            title="Generate shopping list?"
            description={confirms.generateDescription}
            confirmLabel="Generate"
            onConfirm={confirms.confirmGenerate}
            onCancel={() => confirms.setGenerateOpen(false)}
            disabled={state.isGenerating}
            confirmVariant="primary"
          />
        </View>
      </Screen>
      {toastBanner}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screenContent: {
    padding: 0,
    gap: 0,
  },
  contentWrap: {
    paddingHorizontal: theme.spacing.s3,
    paddingTop: theme.spacing.s3,
    paddingBottom: 140,
    gap: theme.spacing.s4,
  },
  toastOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  toastWrap: {
    alignSelf: 'stretch',
    marginHorizontal: theme.spacing.s3,
  },
  sectionCard: {
    gap: theme.spacing.s3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  addButton: {
    height: 30,
    width: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPressed: {
    opacity: 0.85,
  },
  entryList: {
    gap: theme.spacing.s3,
  },
  sheetRow: {
    flexDirection: 'row',
    gap: theme.spacing.s3,
  },
  sheetRowItem: {
    flex: 1,
    gap: theme.spacing.s2,
  },
  sheetLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  itemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s2,
  },
  extrasList: {
    gap: theme.spacing.s2,
  },
  extrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: 10,
  },
  extrasLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    flex: 1,
  },
  extrasCheck: {
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
  },
  extrasText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  extrasRemove: {
    height: 22,
    width: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  extrasRemovePressed: {
    opacity: 0.85,
  },
  sheetSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.s2,
  },
  sheetBlock: {
    gap: theme.spacing.s3,
  },
  sheetHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  recipeList: {
    gap: theme.spacing.s2,
  },
  sheetFooter: {
    gap: theme.spacing.s2,
  },
  sheetScroll: {
    marginBottom: 0,
  },
  sheetScrollContent: {
    gap: theme.spacing.s3,
    paddingBottom: theme.spacing.s4,
  },
  formError: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionListHeader: {
    gap: theme.spacing.s2,
  },
  sectionListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  sectionListDivider: {
    height: 1,
    backgroundColor: theme.colors.borderNeutral,
  },
  sectionList: {
    gap: 0,
  },
  sectionListSeparator: {
    height: theme.spacing.s2,
  },
  sectionListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: 14,
  },
  sectionListRowActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  sectionListRowPlaceholder: {
    marginTop: theme.spacing.s2,
  },
  sectionDragHandle: {
    paddingLeft: theme.spacing.s2,
    paddingVertical: 2,
  },
  sectionListText: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
  },
});
