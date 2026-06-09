import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Archive, CheckCircle2, ListMinus, PencilLine, Trash2 } from 'lucide-react-native';
import { ShoppingListItemRow } from '@/src/features/shopping-lists/ui/ShoppingListItemRow';
import { ShoppingListItemEditorSheet } from '@/src/features/shopping-lists/ui/ShoppingListItemEditorSheet';
import { ShoppingListRenameSheet } from '@/src/features/shopping-lists/ui/ShoppingListRenameSheet';
import type { ShoppingListItem } from '@/src/features/shopping-lists/types';
import { useShoppingListDetailsScreen } from '@/src/features/shopping-lists/hooks/useShoppingListDetailsScreen';
import {
  ConfirmSheet,
  ToastBanner,
  LoadingScreen,
  ModalSheet,
  Screen,
  SegmentedTabs,
  useGlobalToast,
} from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

export default function ShoppingListDetailsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const view = useShoppingListDetailsScreen();
  const { state, data, actions, toast, addSheet, editSheet, renameSheet, confirms, options } = view;
  const { toast: globalToast } = useGlobalToast();
  const filterTabs = useMemo(
    () => [
      { key: 'all', label: `All (${data.totalCount})` },
      { key: 'unchecked', label: t('shoppingLists.unchecked', { count: data.uncheckedCount }) },
      { key: 'checked', label: t('shoppingLists.checkedSection', { count: data.checkedCount }) },
    ],
    [data.checkedCount, data.totalCount, data.uncheckedCount, t],
  );

  const toastBanner =
    toast.state.toast && toast.showToast && !globalToast ? (
      <View style={[styles.toastOverlay, { pointerEvents: 'box-none' }]}>
        <View style={[styles.toastWrap, { marginTop: toast.topInset + 8, pointerEvents: 'none' }]}>
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
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryText}>
              <Text style={styles.summaryTitle}>{t('shoppingLists.items')}</Text>
              <Text style={styles.summaryMeta}>
                {t('shoppingLists.totalChecked', {
                  total: data.totalCount,
                  checked: data.checkedCount,
                })}
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
              <Text style={styles.emptyTitle}>{t('shoppingLists.noItemsYet')}</Text>
              <Text style={styles.emptySubtitle}>{t('shoppingLists.addFirstItemSubtitle')}</Text>
            </View>
          ) : (
            <View style={styles.sections}>
              <SectionBlock
                title={t('shoppingLists.unchecked', { count: data.uncheckedCount })}
                items={data.uncheckedItems}
                onEdit={actions.openEditSheet}
                onToggle={actions.toggleItem}
                onDelete={actions.requestDelete}
              />
              <SectionBlock
                title={t('shoppingLists.checkedSection', { count: data.checkedCount })}
                items={data.checkedItems}
                onEdit={actions.openEditSheet}
                onToggle={actions.toggleItem}
                onDelete={actions.requestDelete}
              />
            </View>
          )
        ) : data.visibleItems.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>{t('shoppingLists.noItemsHere')}</Text>
            <Text style={styles.emptySubtitle}>{t('shoppingLists.addSomethingSubtitle')}</Text>
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

      <ShoppingListItemEditorSheet
        visible={addSheet.open}
        title={t('shoppingLists.addItem')}
        name={addSheet.name}
        quantity={addSheet.quantity}
        unit={addSheet.unit}
        onChangeName={addSheet.setName}
        onChangeQuantity={addSheet.setQuantity}
        onChangeUnit={addSheet.setUnit}
        onSave={addSheet.handleSave}
        onCancel={() => addSheet.setOpen(false)}
        saveLabel={state.isSaving ? t('shoppingLists.saving') : t('shoppingLists.addItem')}
        disabled={state.isSaving}
        formError={addSheet.formError}
      />

      <ShoppingListItemEditorSheet
        visible={editSheet.open}
        title={t('shoppingLists.editItem')}
        name={editSheet.name}
        quantity={editSheet.quantity}
        unit={editSheet.unit}
        onChangeName={editSheet.setName}
        onChangeQuantity={editSheet.setQuantity}
        onChangeUnit={editSheet.setUnit}
        onSave={editSheet.handleSave}
        onCancel={() => editSheet.setOpen(false)}
        saveLabel={state.isSaving ? t('shoppingLists.saving') : t('shoppingLists.saveChanges')}
        disabled={state.isSaving}
      />

      <ShoppingListRenameSheet
        visible={renameSheet.open}
        title={t('shoppingLists.renameList')}
        value={renameSheet.title}
        onChangeText={renameSheet.setTitle}
        onSave={renameSheet.handleSave}
        onCancel={() => renameSheet.setOpen(false)}
        saveLabel={state.isSaving ? t('shoppingLists.saving') : t('shoppingLists.saveName')}
        disabled={state.isSaving}
        formError={renameSheet.formError}
      />

      <ConfirmSheet
        visible={confirms.deleteOpen}
        title={t('shoppingLists.deleteItem')}
        description={`Remove ${confirms.deleteLabel} from the list?`}
        confirmLabel={t('common.delete')}
        onCancel={() => confirms.setDeleteOpen(false)}
        onConfirm={confirms.confirmDelete}
        disabled={state.isSaving}
      />

      <ConfirmSheet
        visible={confirms.clearOpen}
        title={confirms.clearLabel}
        description={t('common.thisActionCannotBeUndone')}
        confirmLabel={t('common.confirm')}
        onCancel={() => confirms.setClearOpen(false)}
        onConfirm={confirms.confirmClear}
        disabled={state.isSaving}
        confirmVariant="danger"
      />

      <ConfirmSheet
        visible={confirms.deleteListOpen}
        title={t('shoppingLists.deleteListTitle')}
        description={t('shoppingLists.deleteListBody')}
        confirmLabel={t('common.delete')}
        onCancel={() => confirms.setDeleteListOpen(false)}
        onConfirm={confirms.confirmDeleteList}
        disabled={state.isSaving}
        confirmVariant="danger"
      />

      <ModalSheet visible={options.open} onClose={() => options.setOpen(false)}>
        <View style={styles.optionsSheet}>
          <Pressable style={styles.optionRow} onPress={options.handleRename}>
            <PencilLine size={18} color={theme.colors.text} />
            <Text style={styles.optionText}>{t('shoppingLists.renameListOption')}</Text>
          </Pressable>
          {data.list?.status === 'active' ? (
            <Pressable style={styles.optionRow} onPress={options.handleArchive}>
              <Archive size={18} color={theme.colors.text} />
              <Text style={styles.optionText}>{t('shoppingLists.archiveList')}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.optionRow} onPress={options.handleUncheckAll}>
            <CheckCircle2 size={18} color={theme.colors.text} />
            <Text style={styles.optionText}>{t('shoppingLists.uncheckAllItems')}</Text>
          </Pressable>
          <Pressable style={styles.optionRow} onPress={options.handleClearChecked}>
            <ListMinus size={18} color={theme.colors.text} />
            <Text style={styles.optionText}>{t('shoppingLists.clearCheckedItems')}</Text>
          </Pressable>
          <Pressable style={styles.optionRow} onPress={options.handleClearAll}>
            <Trash2 size={18} color={theme.colors.text} />
            <Text style={styles.optionText}>{t('shoppingLists.clearAllItems')}</Text>
          </Pressable>
          <Pressable style={styles.optionRow} onPress={options.handleDeleteList}>
            <Trash2 size={18} color={theme.colors.error} />
            <Text style={[styles.optionText, styles.optionDanger]}>{t('shoppingLists.deleteList')}</Text>
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
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  if (items.length === 0) {
    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionEmpty}>{t('shoppingLists.noItems')}</Text>
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    content: {
      gap: theme.spacing.s4,
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
