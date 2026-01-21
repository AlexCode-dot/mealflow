import { useMemo } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Archive, CheckCircle2, ListMinus, PencilLine, Trash2 } from 'lucide-react-native';
import { ShoppingListItemRow } from '@/src/features/shopping-lists/ui/ShoppingListItemRow';
import type { ShoppingListItem } from '@/src/features/shopping-lists/types';
import { useShoppingListDetailsScreen } from '@/src/features/shopping-lists/hooks/useShoppingListDetailsScreen';
import {
  Button,
  ConfirmSheet,
  ErrorText,
  FormSheet,
  LoadingScreen,
  ModalSheet,
  Screen,
  SegmentedTabs,
  TextField,
  ToastBanner,
} from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';

export default function ShoppingListDetailsScreen() {
  const view = useShoppingListDetailsScreen();
  const { state, data, actions, toast, addSheet, editSheet, renameSheet, confirms, options } = view;

  const filterTabs = useMemo(
    () => [
      { key: 'all', label: `All (${data.totalCount})` },
      { key: 'unchecked', label: `Unchecked (${data.uncheckedCount})` },
      { key: 'checked', label: `Checked (${data.checkedCount})` },
    ],
    [data.checkedCount, data.totalCount, data.uncheckedCount],
  );

  const toastBanner =
    toast.state.toast && toast.showToast ? (
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
        onTitlePress={actions.openRenameSheet}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
        }
        contentStyle={[styles.content, { paddingBottom: state.contentPaddingBottom }]}
      >
        {state.error ? (
          <View style={styles.errorBlock}>
            <ErrorText>{state.error}</ErrorText>
            <Button title="Retry" onPress={actions.load} variant="secondary" />
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>Items</Text>
              <Text style={styles.summaryMeta}>
                {data.totalCount} total · {data.checkedCount} checked
              </Text>
            </View>
            <Text style={styles.summaryPercent}>{data.progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${data.progress}%` }]} />
          </View>
        </View>

        <SegmentedTabs
          tabs={filterTabs}
          value={state.filter}
          onChange={(value) => actions.setFilter(value as typeof state.filter)}
        />

        {state.filter === 'all' ? (
          data.totalCount === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>No items yet</Text>
              <Text style={styles.emptySubtitle}>Add your first item to get started.</Text>
            </View>
          ) : (
            <View style={styles.sections}>
              <SectionBlock
                title={`Unchecked (${data.uncheckedCount})`}
                items={data.uncheckedItems}
                onEdit={actions.openEditSheet}
                onToggle={actions.toggleItem}
                onDelete={actions.requestDelete}
              />
              <SectionBlock
                title={`Checked (${data.checkedCount})`}
                items={data.checkedItems}
                onEdit={actions.openEditSheet}
                onToggle={actions.toggleItem}
                onDelete={actions.requestDelete}
              />
            </View>
          )
        ) : data.visibleItems.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>No items here yet</Text>
            <Text style={styles.emptySubtitle}>Add something to keep the list moving.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {data.visibleItems.map((item) => (
              <ShoppingListItemRow
                key={item.id}
                item={item}
                onToggle={() => actions.toggleItem(item)}
                onEdit={() => actions.openEditSheet(item)}
                onDelete={() => actions.requestDelete(item)}
              />
            ))}
          </View>
        )}
      </Screen>

      {toastBanner}

      <FormSheet
        visible={addSheet.open}
        title="Add Item"
        onClose={() => addSheet.setOpen(false)}
        footer={
          <View style={styles.sheetFooter}>
            {addSheet.formError ? <Text style={styles.formError}>{addSheet.formError}</Text> : null}
            <Button
              title={state.isSaving ? 'Saving...' : 'Add Item'}
              onPress={addSheet.handleSave}
              disabled={state.isSaving}
            />
          </View>
        }
        footerFullBleed
      >
        <TextField
          label="Item name"
          value={addSheet.name}
          onChangeText={addSheet.setName}
          placeholder="e.g. Tortilla"
        />
        <TextField
          label="Quantity"
          value={addSheet.quantity}
          onChangeText={addSheet.setQuantity}
          placeholder="Optional"
          keyboardType="numeric"
        />
        <TextField
          label="Unit"
          value={addSheet.unit}
          onChangeText={addSheet.setUnit}
          placeholder="Optional"
        />
      </FormSheet>

      <FormSheet
        visible={editSheet.open}
        title="Edit Item"
        onClose={() => editSheet.setOpen(false)}
        footer={
          <View style={styles.sheetFooter}>
            <Button
              title={state.isSaving ? 'Saving...' : 'Save Changes'}
              onPress={editSheet.handleSave}
              disabled={state.isSaving}
            />
          </View>
        }
        footerFullBleed
      >
        <TextField
          label="Item name"
          value={editSheet.name}
          onChangeText={editSheet.setName}
          placeholder="e.g. Tortilla"
        />
        <TextField
          label="Quantity"
          value={editSheet.quantity}
          onChangeText={editSheet.setQuantity}
          placeholder="Optional"
          keyboardType="numeric"
        />
        <TextField
          label="Unit"
          value={editSheet.unit}
          onChangeText={editSheet.setUnit}
          placeholder="Optional"
        />
      </FormSheet>

      <FormSheet
        visible={renameSheet.open}
        title="Rename List"
        onClose={() => renameSheet.setOpen(false)}
        footer={
          <View style={styles.sheetFooter}>
            {renameSheet.formError ? (
              <Text style={styles.formError}>{renameSheet.formError}</Text>
            ) : null}
            <Button
              title={state.isSaving ? 'Saving...' : 'Save Name'}
              onPress={renameSheet.handleSave}
              disabled={state.isSaving}
            />
          </View>
        }
        footerFullBleed
      >
        <TextField
          label="List name"
          value={renameSheet.title}
          onChangeText={renameSheet.setTitle}
          placeholder="e.g. Week 45"
        />
      </FormSheet>

      <ConfirmSheet
        visible={confirms.deleteOpen}
        title="Delete item"
        description={`Remove ${confirms.deleteLabel} from the list?`}
        confirmLabel="Delete"
        onCancel={() => confirms.setDeleteOpen(false)}
        onConfirm={confirms.confirmDelete}
        disabled={state.isSaving}
      />

      <ConfirmSheet
        visible={confirms.clearOpen}
        title={confirms.clearLabel}
        description="This action cannot be undone."
        confirmLabel="Confirm"
        onCancel={() => confirms.setClearOpen(false)}
        onConfirm={confirms.confirmClear}
        disabled={state.isSaving}
        confirmVariant="danger"
      />

      <ConfirmSheet
        visible={confirms.deleteListOpen}
        title="Delete list?"
        description="This will permanently delete the list."
        confirmLabel="Delete"
        onCancel={() => confirms.setDeleteListOpen(false)}
        onConfirm={confirms.confirmDeleteList}
        disabled={state.isSaving}
        confirmVariant="danger"
      />

      <ModalSheet visible={options.open} onClose={() => options.setOpen(false)}>
        <View style={styles.optionsSheet}>
          <Pressable style={styles.optionRow} onPress={options.handleRename}>
            <PencilLine size={18} color={theme.colors.text} />
            <Text style={styles.optionText}>Rename list</Text>
          </Pressable>
          {data.list?.status === 'active' ? (
            <Pressable style={styles.optionRow} onPress={options.handleArchive}>
              <Archive size={18} color={theme.colors.text} />
              <Text style={styles.optionText}>Archive list</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.optionRow} onPress={options.handleUncheckAll}>
            <CheckCircle2 size={18} color={theme.colors.text} />
            <Text style={styles.optionText}>Uncheck all items</Text>
          </Pressable>
          <Pressable style={styles.optionRow} onPress={options.handleClearChecked}>
            <ListMinus size={18} color={theme.colors.text} />
            <Text style={styles.optionText}>Clear checked items</Text>
          </Pressable>
          <Pressable style={styles.optionRow} onPress={options.handleClearAll}>
            <Trash2 size={18} color={theme.colors.text} />
            <Text style={styles.optionText}>Clear all items</Text>
          </Pressable>
          <Pressable style={styles.optionRow} onPress={options.handleDeleteList}>
            <Trash2 size={18} color={theme.colors.error} />
            <Text style={[styles.optionText, styles.optionDanger]}>Delete list</Text>
          </Pressable>
        </View>
      </ModalSheet>
    </View>
  );
}

function SectionBlock({
  title,
  items,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string;
  items: ShoppingListItem[];
  onToggle: (item: ShoppingListItem) => void;
  onEdit: (item: ShoppingListItem) => void;
  onDelete: (item: ShoppingListItem) => void;
}) {
  if (items.length === 0) {
    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionEmpty}>No items</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <ShoppingListItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggle(item)}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: theme.spacing.s4,
  },
  errorBlock: {
    gap: theme.spacing.s3,
  },
  summaryCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.s4,
    gap: theme.spacing.s3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    gap: theme.spacing.s1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textOnPrimary,
  },
  summaryMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.iconMutedOnPrimary,
  },
  summaryPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textOnPrimary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(245,241,230,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
  },
  sections: {
    gap: theme.spacing.s4,
  },
  sectionBlock: {
    gap: theme.spacing.s3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  sectionEmpty: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: theme.spacing.s3,
  },
  emptyBlock: {
    padding: theme.spacing.s4,
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    gap: theme.spacing.s2,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  toastOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 5,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  toastWrap: {
    width: '92%',
  },
  sheetFooter: {
    paddingHorizontal: theme.spacing.s4,
    paddingTop: theme.spacing.s3,
    paddingBottom: theme.spacing.s5,
  },
  formError: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: theme.spacing.s2,
  },
  optionsSheet: {
    gap: theme.spacing.s4,
    paddingBottom: theme.spacing.s4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    paddingVertical: theme.spacing.s3,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  optionDanger: {
    color: theme.colors.error,
  },
});
