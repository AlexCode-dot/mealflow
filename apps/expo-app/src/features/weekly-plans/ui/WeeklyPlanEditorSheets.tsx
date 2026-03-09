import { useMemo, useRef } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Check, CalendarDays, GripVertical, List, Users, X } from 'lucide-react-native';
import { RECIPE_PORTIONS_OPTIONS } from '@/src/features/recipes/constants/recipePickerOptions';
import { RecipeActionBar } from '@/src/features/recipes/ui/RecipeActionBar';
import { RecipeSelectField } from '@/src/features/recipes/ui/RecipeSelectField';
import {
  type WeeklyPlanDetailsAddSheet,
  type WeeklyPlanDetailsData,
  type WeeklyPlanDetailsEditSheet,
  type WeeklyPlanDetailsSectionSheet,
} from '@/src/features/weekly-plans/hooks/useWeeklyPlanDetailsScreen';
import { AddMealRecipeCard } from '@/src/features/weekly-plans/ui/AddMealRecipeCard';
import { SECTION_DRAFT_ID } from '@/src/features/weekly-plans/constants/weeklyPlanDefaults';
import { useFocusedInputSheetAdjustment } from '@/src/shared/hooks/useFocusedInputSheetAdjustment';
import {
  BottomActionBar,
  InlineAddField,
  PickerSelect,
  PickerSheetOverlay,
  ScrollableFormSheet,
  SearchField,
  SegmentedTabs,
  TextField,
} from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type AddMealSheetProps = {
  visible: boolean;
  onClose: () => void;
  isSaving: boolean;
  addSheet: WeeklyPlanDetailsAddSheet;
  data: WeeklyPlanDetailsData;
};

type EditMealSheetProps = {
  visible: boolean;
  onClose: () => void;
  editSheet: WeeklyPlanDetailsEditSheet;
  data: WeeklyPlanDetailsData;
};

type SectionEditorSheetProps = {
  visible: boolean;
  onClose: () => void;
  sectionSheet: WeeklyPlanDetailsSectionSheet;
};

export function WeeklyPlanAddMealSheet({
  visible,
  onClose,
  isSaving,
  addSheet,
  data,
}: AddMealSheetProps) {
  const styles = useThemedStyles(createStyles);
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const titleInputRef = useRef<TextInput | null>(null);
  const itemsInputRef = useRef<TextInput | null>(null);
  const { focusInput, clearFocus, extraHeight } = useFocusedInputSheetAdjustment(scrollRef, {
    screenHeight,
    defaultKeyboardOffset: 12,
    desiredGap: 20,
  });

  return (
    <ScrollableFormSheet
      visible={visible}
      title="Add Meal"
      onClose={onClose}
      maxHeight={Math.min(520, screenHeight * 0.6)}
      extraHeight={extraHeight}
      scrollRef={scrollRef}
      footer={
        <>
          {addSheet.formError ? (
            <View style={styles.footerErrorWrap}>
              <Text style={styles.formError}>{addSheet.formError}</Text>
            </View>
          ) : null}
          <RecipeActionBar
            onCancel={onClose}
            onSave={addSheet.handleSaveEntry}
            saveLabel={isSaving ? 'Saving...' : 'Add Meal'}
            disabled={isSaving}
          />
        </>
      }
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
        onChange={(key) => addSheet.setTab(key as typeof addSheet.tab)}
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
            inputRef={titleInputRef}
            label="Title"
            value={addSheet.customTitle}
            onChangeText={addSheet.setCustomTitle}
            placeholder="Meal name..."
            onFocus={() => focusInput(titleInputRef, 24)}
            onBlur={clearFocus}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <InlineAddField
            inputRef={itemsInputRef}
            label="Items"
            value={addSheet.itemInput}
            onChangeText={addSheet.setItemInput}
            placeholder="Add an item..."
            onAdd={addSheet.handleAddItem}
            onFocus={() => focusInput(itemsInputRef, 72)}
            onBlur={clearFocus}
          />

          {addSheet.items.length ? (
            <ExtrasList
              items={addSheet.items}
              onRemove={(idx) => addSheet.setItems((prev) => prev.filter((_, i) => i !== idx))}
            />
          ) : null}
        </View>
      )}
    </ScrollableFormSheet>
  );
}

export function WeeklyPlanEditMealSheet({ visible, onClose, editSheet, data }: EditMealSheetProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const titleInputRef = useRef<TextInput | null>(null);
  const itemsInputRef = useRef<TextInput | null>(null);
  const extrasInputRef = useRef<TextInput | null>(null);
  const { focusInput, clearFocus, extraHeight } = useFocusedInputSheetAdjustment(scrollRef, {
    screenHeight,
    defaultKeyboardOffset: 12,
    desiredGap: 20,
  });

  const overlay = useMemo(() => {
    if (!editSheet.editPickerOpen) return null;

    const close = () => editSheet.setEditPickerOpen(null);

    if (editSheet.editPickerOpen === 'day') {
      return (
        <View style={styles.pickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <PickerSheetOverlay title="Day" onClose={close} onDone={close}>
            <PickerSelect
              value={editSheet.editDay}
              onChange={editSheet.setEditDay}
              options={editSheet.editDayOptions.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
            />
          </PickerSheetOverlay>
        </View>
      );
    }

    if (editSheet.editPickerOpen === 'section') {
      return (
        <View style={styles.pickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <PickerSheetOverlay title="Section" onClose={close} onDone={close}>
            <PickerSelect
              value={editSheet.editSection}
              onChange={editSheet.setEditSection}
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
            value={editSheet.editPortions}
            onChange={editSheet.setEditPortions}
            options={RECIPE_PORTIONS_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
          />
        </PickerSheetOverlay>
      </View>
    );
  }, [data.sectionOptions, editSheet, styles.pickerOverlay]);

  return (
    <ScrollableFormSheet
      visible={visible}
      title={
        editSheet.tab === 'recipes'
          ? (editSheet.editRecipe?.title ?? 'Meal')
          : editSheet.editTitle || 'Meal'
      }
      onClose={onClose}
      maxHeight={Math.min(560, screenHeight * 0.68)}
      extraHeight={extraHeight}
      scrollRef={scrollRef}
      overlay={overlay}
      footer={
        <>
          <View style={styles.footerSpacer} />
          <BottomActionBar items={editSheet.actionItems} />
        </>
      }
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
                icon={<CalendarDays color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
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

          <InlineAddField
            inputRef={extrasInputRef}
            label="Extra items"
            value={editSheet.editExtraInput}
            onChangeText={editSheet.setEditExtraInput}
            placeholder="Add extra item..."
            onAdd={editSheet.handleEditExtraAdd}
            onFocus={() => focusInput(extrasInputRef, 72)}
            onBlur={clearFocus}
          />

          {editSheet.editExtraItems.length ? (
            <ExtrasList
              items={editSheet.editExtraItems}
              onRemove={(idx) =>
                editSheet.setEditExtraItems((prev) => prev.filter((_, i) => i !== idx))
              }
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.sheetBlock}>
          <View style={styles.sheetRow}>
            <View style={styles.sheetRowItem}>
              <Text style={styles.sheetLabel}>Day</Text>
              <RecipeSelectField
                icon={<CalendarDays color={theme.colors.textMuted} size={18} strokeWidth={2.5} />}
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
            inputRef={titleInputRef}
            label="Title"
            value={editSheet.editTitle}
            onChangeText={editSheet.setEditTitle}
            placeholder="Meal name..."
            onFocus={() => focusInput(titleInputRef, 24)}
            onBlur={clearFocus}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          <InlineAddField
            inputRef={itemsInputRef}
            label="Items"
            value={editSheet.editItemInput}
            onChangeText={editSheet.setEditItemInput}
            placeholder="Add an item..."
            onAdd={editSheet.handleEditItemAdd}
            onFocus={() => focusInput(itemsInputRef, 72)}
            onBlur={clearFocus}
          />

          {editSheet.editItems.length ? (
            <ExtrasList
              items={editSheet.editItems}
              onRemove={(idx) => editSheet.setEditItems((prev) => prev.filter((_, i) => i !== idx))}
            />
          ) : null}
        </View>
      )}
    </ScrollableFormSheet>
  );
}

export function WeeklyPlanSectionEditorSheet({
  visible,
  onClose,
  sectionSheet,
}: SectionEditorSheetProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const titleInputRef = useRef<TextInput | null>(null);
  const { focusInput, clearFocus, extraHeight } = useFocusedInputSheetAdjustment(scrollRef, {
    screenHeight,
    defaultKeyboardOffset: 12,
    desiredGap: 20,
  });

  return (
    <ScrollableFormSheet
      visible={visible}
      title="Add Section"
      onClose={onClose}
      maxHeight={Math.min(520, screenHeight * 0.6)}
      extraHeight={extraHeight}
      scrollRef={scrollRef}
      footer={
        <>
          <View style={styles.footerSpacer} />
          <BottomActionBar items={sectionSheet.actionItems} />
        </>
      }
    >
      <TextField
        inputRef={titleInputRef}
        label="Title"
        value={sectionSheet.newSectionTitle}
        onChangeText={sectionSheet.setNewSectionTitle}
        placeholder="Section title..."
        onFocus={() => focusInput(titleInputRef, 24)}
        onBlur={clearFocus}
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
              !isDraft && sectionSheet.selectedSection?.toLowerCase() === item.toLowerCase();

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
                <Pressable onLongPress={drag} disabled={isActive} style={styles.sectionDragHandle}>
                  <GripVertical color={theme.colors.primary} size={20} strokeWidth={2.4} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      </View>
    </ScrollableFormSheet>
  );
}

function ExtrasList({ items, onRemove }: { items: string[]; onRemove: (index: number) => void }) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();

  return (
    <View style={styles.extrasList}>
      {items.map((item, idx) => (
        <View key={`${item}-${idx}`} style={styles.extrasRow}>
          <View style={styles.extrasLeft}>
            <View style={styles.extrasCheck}>
              <Check size={14} color={theme.colors.primaryDark} strokeWidth={2.6} />
            </View>
            <Text style={styles.extrasText}>{item}</Text>
          </View>
          <Pressable
            onPress={() => onRemove(idx)}
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
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
    footerErrorWrap: {
      paddingHorizontal: theme.spacing.s4,
      paddingTop: theme.spacing.s3,
    },
    footerSpacer: {
      height: theme.spacing.s3,
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
