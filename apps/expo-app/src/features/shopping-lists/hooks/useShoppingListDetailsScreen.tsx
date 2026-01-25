import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListX, MoreVertical, Plus } from 'lucide-react-native';
import { shoppingListsApi } from '@/src/features/shopping-lists/api/shoppingListsApi';
import type { ShoppingList, ShoppingListItem } from '@/src/features/shopping-lists/types';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { toApiError } from '@/src/core/http/toApiError';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { useBottomBarActions, useGlobalToast, type BottomActionBarItem } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { routes } from '@/src/core/navigation/routes';
import { normalizePath } from '@/src/core/navigation/normalizePath';
import { buildHref } from '@/src/core/navigation/buildHref';

export type ShoppingListFilter = 'all' | 'unchecked' | 'checked';

export type ShoppingListDetailsState = {
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  error: UiError | null;
  filter: ShoppingListFilter;
  title: string;
  contentPaddingBottom: number;
};

export type ShoppingListDetailsData = {
  list: ShoppingList | null;
  totalCount: number;
  checkedCount: number;
  uncheckedCount: number;
  progress: number;
  uncheckedItems: ShoppingListItem[];
  checkedItems: ShoppingListItem[];
  visibleItems: ShoppingListItem[];
};

export type ShoppingListDetailsActions = {
  load: () => Promise<void>;
  handleBack: () => void;
  handleRefresh: () => Promise<void>;
  setFilter: (value: ShoppingListFilter) => void;
  toggleItem: (item: ShoppingListItem) => Promise<void>;
  openAddSheet: () => void;
  openEditSheet: (item: ShoppingListItem) => void;
  openRenameSheet: () => void;
  requestDelete: (item: ShoppingListItem) => void;
  openOptions: () => void;
};

export type ShoppingListDetailsToast = {
  state: ReturnType<typeof useToastState>;
  showToast: boolean;
  topInset: number;
};

export type ShoppingListDetailsAddSheet = {
  open: boolean;
  setOpen: (value: boolean) => void;
  name: string;
  setName: (value: string) => void;
  quantity: string;
  setQuantity: (value: string) => void;
  unit: string;
  setUnit: (value: string) => void;
  formError: string | null;
  handleSave: () => Promise<void>;
};

export type ShoppingListDetailsEditSheet = {
  open: boolean;
  setOpen: (value: boolean) => void;
  item: ShoppingListItem | null;
  name: string;
  setName: (value: string) => void;
  quantity: string;
  setQuantity: (value: string) => void;
  unit: string;
  setUnit: (value: string) => void;
  handleSave: () => Promise<void>;
};

export type ShoppingListDetailsRenameSheet = {
  open: boolean;
  setOpen: (value: boolean) => void;
  title: string;
  setTitle: (value: string) => void;
  formError: string | null;
  handleSave: () => Promise<void>;
};

export type ShoppingListDetailsConfirms = {
  deleteOpen: boolean;
  deleteLabel: string;
  setDeleteOpen: (value: boolean) => void;
  confirmDelete: () => Promise<void>;
  clearOpen: boolean;
  clearLabel: string;
  setClearOpen: (value: boolean) => void;
  confirmClear: () => Promise<void>;
  deleteListOpen: boolean;
  setDeleteListOpen: (value: boolean) => void;
  confirmDeleteList: () => Promise<void>;
};

export type ShoppingListDetailsOptions = {
  open: boolean;
  setOpen: (value: boolean) => void;
  actionItems: BottomActionBarItem[];
  handleRename: () => void;
  handleArchive: () => Promise<void>;
  handleDeleteList: () => void;
  handleUncheckAll: () => void;
  handleClearChecked: () => void;
  handleClearAll: () => void;
};

export type ShoppingListDetailsView = {
  state: ShoppingListDetailsState;
  data: ShoppingListDetailsData;
  actions: ShoppingListDetailsActions;
  toast: ShoppingListDetailsToast;
  addSheet: ShoppingListDetailsAddSheet;
  editSheet: ShoppingListDetailsEditSheet;
  renameSheet: ShoppingListDetailsRenameSheet;
  confirms: ShoppingListDetailsConfirms;
  options: ShoppingListDetailsOptions;
};

export function useShoppingListDetailsScreen(): ShoppingListDetailsView {
  const params = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const listId = typeof params.id === 'string' ? params.id : null;
  const returnTo = normalizePath(typeof params.returnTo === 'string' ? params.returnTo : null);
  const [list, setList] = useState<ShoppingList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [filter, setFilter] = useState<ShoppingListFilter>('all');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [addUnit, setAddUnit] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<ShoppingListItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShoppingListItem | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearMode, setClearMode] = useState<'checked' | 'all' | 'uncheck'>('checked');
  const [deleteListOpen, setDeleteListOpen] = useState(false);
  const toastState = useToastState();
  const { showError, showValidationError } = useGlobalToast();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    if (!listId) {
      const uiErr: UiError = { kind: 'unknown', message: 'Missing shopping list.' };
      setError(uiErr);
      showError(uiErr);
      return;
    }
    setError(null);
    try {
      const res = await shoppingListsApi.get(listId);
      setList(res);
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
    }
  }, [listId, showError]);

  useEffect(() => {
    setIsLoading(true);
    void load().finally(() => setIsLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const handleBack = useCallback(() => {
    if (returnTo) {
      router.replace(buildHref(returnTo));
      return;
    }
    router.back();
  }, [returnTo]);

  const parseQuantity = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleSaveAdd = useCallback(async () => {
    if (!listId) return;
    const name = addName.trim();
    if (!name) {
      setAddError('Item name is required.');
      return;
    }

    setAddError(null);
    setIsSaving(true);
    try {
      const quantity = parseQuantity(addQuantity);
      const unit = addUnit.trim() || null;
      const updated = await shoppingListsApi.addItem(listId, {
        name,
        quantity,
        unit,
      });
      setList(updated);
      setAddOpen(false);
      setAddName('');
      setAddQuantity('');
      setAddUnit('');
      toastState.show({ variant: 'success', message: 'Item added.' });
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      setAddError(uiErr.message);
    } finally {
      setIsSaving(false);
    }
  }, [addName, addQuantity, addUnit, listId, toastState]);

  const handleSaveEdit = useCallback(async () => {
    if (!listId || !editItem) return;
    const name = editName.trim();
    if (!name) {
      showValidationError('Item name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const quantity = parseQuantity(editQuantity);
      const unit = editUnit.trim() || null;
      const updated = await shoppingListsApi.updateItem(listId, editItem.id, {
        name,
        quantity,
        unit,
      });
      setList(updated);
      setEditOpen(false);
      setEditItem(null);
      toastState.show({ variant: 'success', message: 'Item updated.' });
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showError(uiErr);
    } finally {
      setIsSaving(false);
    }
  }, [
    editItem,
    editName,
    editQuantity,
    editUnit,
    listId,
    showError,
    showValidationError,
    toastState,
  ]);

  const toggleItem = useCallback(
    async (item: ShoppingListItem) => {
      if (!listId) return;
      try {
        const updated = await shoppingListsApi.updateItem(listId, item.id, {
          checked: !item.checked,
        });
        setList(updated);
      } catch (err) {
        const uiErr = mapCommonError(toApiError(err));
        showError(uiErr);
      }
    },
    [listId, showError],
  );

  const openAddSheet = useCallback(() => {
    setAddError(null);
    setAddOpen(true);
  }, []);

  const openEditSheet = useCallback((item: ShoppingListItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditQuantity(item.quantity == null ? '' : String(item.quantity));
    setEditUnit(item.unit ?? '');
    setEditOpen(true);
  }, []);

  const requestDelete = useCallback((item: ShoppingListItem) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }, []);

  const openOptions = useCallback(() => setOptionsOpen(true), []);

  const handleRename = useCallback(() => {
    setRenameError(null);
    setRenameTitle(list?.title ?? '');
    setRenameOpen(true);
    setOptionsOpen(false);
  }, [list?.title]);

  const openRenameSheet = useCallback(() => {
    setRenameError(null);
    setRenameTitle(list?.title ?? '');
    setRenameOpen(true);
  }, [list?.title]);

  const confirmDelete = useCallback(async () => {
    if (!listId || !deleteTarget) return;
    setIsSaving(true);
    try {
      await shoppingListsApi.removeItem(listId, deleteTarget.id);
      const updated = await shoppingListsApi.get(listId);
      setList(updated);
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showError(uiErr);
    } finally {
      setIsSaving(false);
    }
  }, [deleteTarget, listId, showError]);

  const handleArchive = useCallback(async () => {
    if (!listId) return;
    setIsSaving(true);
    try {
      await shoppingListsApi.patch(listId, { status: 'archived' });
      router.replace(routes.shoppingListWithToast('archived'));
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showError(uiErr);
    } finally {
      setIsSaving(false);
      setOptionsOpen(false);
    }
  }, [listId, showError]);

  const handleRenameSave = useCallback(async () => {
    if (!listId) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError('List name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await shoppingListsApi.patch(listId, { title });
      setList(updated);
      setRenameOpen(false);
      toastState.show({ variant: 'success', message: 'List renamed.' });
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      setRenameError(uiErr.message);
    } finally {
      setIsSaving(false);
    }
  }, [listId, renameTitle, toastState]);

  const handleUncheckAll = useCallback(async () => {
    if (!listId) return;

    setIsSaving(true);
    try {
      const current = await shoppingListsApi.get(listId);
      const checkedItems = current.items.filter((item) => item.checked);
      if (checkedItems.length === 0) return;

      let updated = current;
      for (const item of checkedItems) {
        updated = await shoppingListsApi.updateItem(listId, item.id, { checked: false });
      }
      setList(updated);
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showError(uiErr);
    } finally {
      setIsSaving(false);
      setOptionsOpen(false);
    }
  }, [listId, showError]);

  const handleClearChecked = useCallback(async () => {
    if (!listId) return;

    setIsSaving(true);
    try {
      const current = await shoppingListsApi.get(listId);
      const checkedItems = current.items.filter((item) => item.checked);
      if (checkedItems.length === 0) return;

      for (const item of checkedItems) {
        await shoppingListsApi.removeItem(listId, item.id);
      }
      const updated = await shoppingListsApi.get(listId);
      setList(updated);
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showError(uiErr);
    } finally {
      setIsSaving(false);
      setOptionsOpen(false);
    }
  }, [listId, showError]);

  const handleClearAll = useCallback(async () => {
    if (!listId) return;

    setIsSaving(true);
    try {
      const current = await shoppingListsApi.get(listId);
      if (current.items.length === 0) return;

      for (const item of current.items) {
        await shoppingListsApi.removeItem(listId, item.id);
      }
      const updated = await shoppingListsApi.get(listId);
      setList(updated);
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showError(uiErr);
    } finally {
      setIsSaving(false);
      setOptionsOpen(false);
    }
  }, [listId, showError]);

  const confirmClear = useCallback(async () => {
    if (clearMode === 'checked') {
      await handleClearChecked();
    }
    if (clearMode === 'all') {
      await handleClearAll();
    }
    if (clearMode === 'uncheck') {
      await handleUncheckAll();
    }
    setClearOpen(false);
  }, [clearMode, handleClearAll, handleClearChecked, handleUncheckAll]);

  const confirmDeleteList = useCallback(async () => {
    if (!listId) return;
    setIsSaving(true);
    try {
      await shoppingListsApi.remove(listId);
      router.replace(routes.shoppingListWithToast('deleted'));
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showError(uiErr);
    } finally {
      setIsSaving(false);
      setDeleteListOpen(false);
      setOptionsOpen(false);
    }
  }, [listId, showError]);

  const uncheckedItems = useMemo(() => list?.items.filter((item) => !item.checked) ?? [], [list]);
  const checkedItems = useMemo(() => list?.items.filter((item) => item.checked) ?? [], [list]);

  const visibleItems = useMemo(() => {
    if (filter === 'unchecked') return uncheckedItems;
    if (filter === 'checked') return checkedItems;
    return list?.items ?? [];
  }, [checkedItems, filter, list, uncheckedItems]);

  const totalCount = list?.items.length ?? 0;
  const checkedCount = checkedItems.length;
  const uncheckedCount = uncheckedItems.length;
  const progress = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  const actionItems = useMemo<BottomActionBarItem[]>(() => {
    const hasChecked = checkedItems.length > 0;
    return [
      {
        key: 'options',
        label: 'Options',
        icon: (
          <MoreVertical
            size={TAB_BAR.ICON_SIZE}
            color={theme.colors.textOnPrimary}
            strokeWidth={2.25}
          />
        ),
        onPress: openOptions,
      },
      {
        key: 'clear',
        label: 'Clear checked',
        icon: (
          <ListX size={TAB_BAR.ICON_SIZE} color={theme.colors.textOnPrimary} strokeWidth={2.25} />
        ),
        onPress: () => {
          setClearMode('checked');
          setClearOpen(true);
        },
        disabled: !hasChecked,
      },
    ];
  }, [checkedItems.length, openOptions]);

  const centerAction = useMemo(
    () => ({
      label: 'Add Item',
      icon: <Plus color={theme.colors.textOnPrimary} size={38} strokeWidth={2.75} />,
      onPress: openAddSheet,
      accessibilityLabel: 'Add item',
    }),
    [openAddSheet],
  );

  useBottomBarActions(
    isFocused ? actionItems : null,
    isFocused ? { mode: 'notched-actions', centerAction } : undefined,
  );

  useEffect(() => {
    if (!addOpen) {
      setAddName('');
      setAddQuantity('');
      setAddUnit('');
      setAddError(null);
    }
  }, [addOpen]);

  useEffect(() => {
    if (!editOpen) {
      setEditItem(null);
      setEditName('');
      setEditQuantity('');
      setEditUnit('');
    }
  }, [editOpen]);

  useEffect(() => {
    if (!renameOpen) {
      setRenameTitle('');
      setRenameError(null);
    }
  }, [renameOpen]);

  const title =
    list?.title && list.title.trim()
      ? list.title
      : list?.status === 'archived'
        ? 'Archived List'
        : 'Active List';

  const state = useMemo(
    () => ({
      isLoading,
      isRefreshing,
      isSaving,
      error,
      filter,
      title,
      contentPaddingBottom: TAB_BAR.BOX_HEIGHT + TAB_BAR.PADDING_TOP + 40 + insets.bottom,
    }),
    [error, filter, insets.bottom, isLoading, isRefreshing, isSaving, title],
  );

  const data = useMemo(
    () => ({
      list,
      totalCount,
      checkedCount,
      uncheckedCount,
      progress,
      uncheckedItems,
      checkedItems,
      visibleItems,
    }),
    [
      checkedCount,
      checkedItems,
      list,
      progress,
      totalCount,
      uncheckedCount,
      uncheckedItems,
      visibleItems,
    ],
  );

  const actions = useMemo(
    () => ({
      load,
      handleBack,
      handleRefresh,
      setFilter,
      toggleItem,
      openAddSheet,
      openEditSheet,
      openRenameSheet,
      requestDelete,
      openOptions,
    }),
    [
      handleBack,
      handleRefresh,
      load,
      openAddSheet,
      openEditSheet,
      openRenameSheet,
      requestDelete,
      openOptions,
      setFilter,
      toggleItem,
    ],
  );

  const toast = useMemo(
    () => ({ state: toastState, showToast: Boolean(toastState.toast), topInset: insets.top }),
    [insets.top, toastState],
  );

  const addSheet = useMemo(
    () => ({
      open: addOpen,
      setOpen: setAddOpen,
      name: addName,
      setName: setAddName,
      quantity: addQuantity,
      setQuantity: setAddQuantity,
      unit: addUnit,
      setUnit: setAddUnit,
      formError: addError,
      handleSave: handleSaveAdd,
    }),
    [addError, addName, addOpen, addQuantity, addUnit, handleSaveAdd],
  );

  const editSheet = useMemo(
    () => ({
      open: editOpen,
      setOpen: setEditOpen,
      item: editItem,
      name: editName,
      setName: setEditName,
      quantity: editQuantity,
      setQuantity: setEditQuantity,
      unit: editUnit,
      setUnit: setEditUnit,
      handleSave: handleSaveEdit,
    }),
    [editItem, editName, editOpen, editQuantity, editUnit, handleSaveEdit],
  );

  const renameSheet = useMemo(
    () => ({
      open: renameOpen,
      setOpen: setRenameOpen,
      title: renameTitle,
      setTitle: setRenameTitle,
      formError: renameError,
      handleSave: handleRenameSave,
    }),
    [handleRenameSave, renameError, renameOpen, renameTitle],
  );

  const confirms = useMemo(
    () => ({
      deleteOpen,
      deleteLabel: deleteTarget?.name ?? 'item',
      setDeleteOpen,
      confirmDelete,
      clearOpen,
      clearLabel:
        clearMode === 'checked'
          ? 'Clear checked items'
          : clearMode === 'uncheck'
            ? 'Uncheck all items'
            : 'Clear all items',
      setClearOpen,
      confirmClear,
      deleteListOpen,
      setDeleteListOpen,
      confirmDeleteList,
    }),
    [
      clearMode,
      clearOpen,
      confirmClear,
      confirmDelete,
      confirmDeleteList,
      deleteListOpen,
      deleteOpen,
      deleteTarget?.name,
    ],
  );

  const options = useMemo(
    () => ({
      open: optionsOpen,
      setOpen: setOptionsOpen,
      actionItems,
      handleRename,
      handleArchive,
      handleDeleteList: () => {
        setDeleteListOpen(true);
        setOptionsOpen(false);
      },
      handleUncheckAll: () => {
        setClearMode('uncheck');
        setClearOpen(true);
        setOptionsOpen(false);
      },
      handleClearChecked: () => {
        setClearMode('checked');
        setClearOpen(true);
        setOptionsOpen(false);
      },
      handleClearAll: () => {
        setClearMode('all');
        setClearOpen(true);
        setOptionsOpen(false);
      },
    }),
    [actionItems, handleArchive, handleRename, optionsOpen, setOptionsOpen],
  );

  const setDeleteOpenSafe = useCallback((value: boolean) => {
    setDeleteOpen(value);
    if (!value) setDeleteTarget(null);
  }, []);

  return useMemo(
    () => ({
      state,
      data,
      actions,
      toast,
      addSheet,
      editSheet,
      renameSheet,
      confirms: { ...confirms, setDeleteOpen: setDeleteOpenSafe },
      options,
    }),
    [
      actions,
      addSheet,
      confirms,
      data,
      editSheet,
      options,
      renameSheet,
      setDeleteOpenSafe,
      state,
      toast,
    ],
  );
}
