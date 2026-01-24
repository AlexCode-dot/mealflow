import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, Download, Plus, ShoppingBasket, Trash2, XCircle } from 'lucide-react-native';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import type { RecipeListItem } from '@/src/features/recipes/types';
import { weeklyPlansApi } from '@/src/features/weekly-plans/api/weeklyPlansApi';
import { shoppingListsApi } from '@/src/features/shopping-lists/api/shoppingListsApi';
import { useWeeklyPlanDetails } from '@/src/features/weekly-plans/hooks/useWeeklyPlanDetails';
import type {
  WeeklyPlan,
  WeeklyPlanEntry,
  WeeklyPlanEntryInput,
} from '@/src/features/weekly-plans/types';
import { routes } from '@/src/core/navigation/routes';
import { toApiError } from '@/src/core/http/toApiError';
import {
  buildWeekDays,
  currentWeekStartIso,
  formatWeekRange,
} from '@/src/features/weekly-plans/utils/weeklyPlanDates';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { useBottomBarActions, useGlobalToast, type BottomActionBarItem } from '@/src/shared/ui';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { theme } from '@/src/shared/theme/theme';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import {
  DEFAULT_WEEKLY_SECTIONS,
  SECTION_DRAFT_ID,
} from '@/src/features/weekly-plans/constants/weeklyPlanDefaults';

export type AddTabKey = 'recipes' | 'custom';

type PickerMode = 'day' | 'section' | 'portions' | null;

type SectionDragPayload = {
  data: string[];
};

type WeeklyPlanDay = ReturnType<typeof buildWeekDays>[number];

export type WeeklyPlanDetailsState = {
  plan: WeeklyPlan | null;
  isLoading: boolean;
  error: UiError | null;
  title: string;
  isRefreshing: boolean;
  isSaving: boolean;
  isSectionSaving: boolean;
  isGenerating: boolean;
  screenHeight: number;
  contentPaddingBottom: number;
};

export type WeeklyPlanDetailsActions = {
  load: () => Promise<void>;
  handleBack: () => void;
  handleRefresh: () => Promise<void>;
  openAddSheet: (section: string) => void;
  openEditSheet: (entry: WeeklyPlanEntry) => void;
  requestGenerateList: () => Promise<void>;
};

export type WeeklyPlanDetailsToast = {
  state: ReturnType<typeof useToastState>;
  showToast: boolean;
  topInset: number;
};

export type WeeklyPlanDetailsDayPicker = {
  dayTabs: WeeklyPlanDay[];
  activeDay: string | null;
  setActiveDay: (day: string | null) => void;
  todayKey: string | null;
};

export type WeeklyPlanDetailsData = {
  planSections: string[];
  entriesForDay: WeeklyPlanEntry[];
  recipesById: Map<string, RecipeListItem>;
  recipes: RecipeListItem[];
  filteredRecipes: RecipeListItem[];
  sectionOptions: string[];
};

export type WeeklyPlanDetailsAddSheet = {
  open: boolean;
  setOpen: (value: boolean) => void;
  tab: AddTabKey;
  setTab: (tab: AddTabKey) => void;
  sheetDayLabel: string;
  addSection: string;
  recipeSearch: string;
  setRecipeSearch: (value: string) => void;
  selectedRecipeId: string | null;
  handleSelectRecipe: (recipe: RecipeListItem) => void;
  customTitle: string;
  setCustomTitle: (value: string) => void;
  itemInput: string;
  setItemInput: (value: string) => void;
  handleAddItem: () => void;
  items: string[];
  setItems: Dispatch<SetStateAction<string[]>>;
  formError: string | null;
  handleSaveEntry: () => Promise<void>;
};

export type WeeklyPlanDetailsEditSheet = {
  open: boolean;
  setOpen: (value: boolean) => void;
  tab: AddTabKey;
  editRecipe: RecipeListItem | null;
  editTitle: string;
  setEditTitle: (value: string) => void;
  editSubtitle: string;
  editDay: string;
  setEditDay: (value: string) => void;
  editDayLabel: string;
  editDayOptions: { label: string; value: string }[];
  editSection: string;
  setEditSection: (value: string) => void;
  editPortions: string;
  setEditPortions: (value: string) => void;
  editPickerOpen: PickerMode;
  setEditPickerOpen: (value: PickerMode) => void;
  editItemInput: string;
  setEditItemInput: (value: string) => void;
  handleEditItemAdd: () => void;
  editItems: string[];
  setEditItems: Dispatch<SetStateAction<string[]>>;
  editExtraInput: string;
  setEditExtraInput: (value: string) => void;
  handleEditExtraAdd: () => void;
  editExtraItems: string[];
  setEditExtraItems: Dispatch<SetStateAction<string[]>>;
  actionItems: BottomActionBarItem[];
  resumeEditOnCancel: boolean;
  setResumeEditOnCancel: (value: boolean) => void;
};

export type WeeklyPlanDetailsSectionSheet = {
  open: boolean;
  setOpen: (value: boolean) => void;
  newSectionTitle: string;
  setNewSectionTitle: (value: string) => void;
  handleAddSectionDraft: () => void;
  sectionDraftWithPlaceholder: string[];
  handleSectionDragEnd: (payload: SectionDragPayload) => void;
  handleSectionSelect: (section: string) => void;
  selectedSection: string | null;
  actionItems: BottomActionBarItem[];
};

export type WeeklyPlanDetailsConfirms = {
  entryDeleteOpen: boolean;
  setEntryDeleteOpen: (value: boolean) => void;
  confirmEntryDelete: () => Promise<void>;
  clearWeekOpen: boolean;
  setClearWeekOpen: (value: boolean) => void;
  confirmClearWeek: () => Promise<void>;
  generateOpen: boolean;
  setGenerateOpen: (value: boolean) => void;
  confirmGenerate: () => Promise<void>;
  generateDescription: string;
  entryDeleteDescription: string;
  clearWeekDescription: string;
};

export type WeeklyPlanDetailsView = {
  state: WeeklyPlanDetailsState;
  actions: WeeklyPlanDetailsActions;
  toast: WeeklyPlanDetailsToast;
  dayPicker: WeeklyPlanDetailsDayPicker;
  data: WeeklyPlanDetailsData;
  addSheet: WeeklyPlanDetailsAddSheet;
  editSheet: WeeklyPlanDetailsEditSheet;
  sectionSheet: WeeklyPlanDetailsSectionSheet;
  confirms: WeeklyPlanDetailsConfirms;
};

const toEntryInput = (entry: WeeklyPlanEntry): WeeklyPlanEntryInput => ({
  id: entry.id,
  day: entry.day,
  section: entry.section,
  recipeId: entry.recipeId ?? undefined,
  customTitle: entry.customTitle ?? undefined,
  items: entry.items?.length ? entry.items : undefined,
  extraItems: entry.extraItems?.length ? entry.extraItems : undefined,
  notes: entry.notes ?? undefined,
  portions: entry.portions ?? undefined,
});

export function useWeeklyPlanDetailsScreen(): WeeklyPlanDetailsView {
  const params = useLocalSearchParams<{ id?: string; editEntryId?: string; editDay?: string }>();
  const planId = typeof params.id === 'string' ? params.id : null;
  const pendingEntryId = typeof params.editEntryId === 'string' ? params.editEntryId : null;
  const pendingDay = typeof params.editDay === 'string' ? params.editDay : null;
  const { plan, isLoading, error, load, setPlan } = useWeeklyPlanDetails(planId);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const didOpenPendingEntry = useRef(false);
  const didApplyPendingDay = useRef(false);
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<AddTabKey>('recipes');
  const [addSection, setAddSection] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [itemInput, setItemInput] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<AddTabKey>('recipes');
  const [editTitle, setEditTitle] = useState('');
  const [editDay, setEditDay] = useState('MON');
  const [editSection, setEditSection] = useState(DEFAULT_WEEKLY_SECTIONS[0]);
  const [editPortions, setEditPortions] = useState('1');
  const [editItemInput, setEditItemInput] = useState('');
  const [editItems, setEditItems] = useState<string[]>([]);
  const [editExtraInput, setEditExtraInput] = useState('');
  const [editExtraItems, setEditExtraItems] = useState<string[]>([]);
  const [editPickerOpen, setEditPickerOpen] = useState<PickerMode>(null);
  const [confirmEntryDeleteOpen, setConfirmEntryDeleteOpen] = useState(false);
  const [confirmClearWeekOpen, setConfirmClearWeekOpen] = useState(false);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
  const [resumeEditOnCancel, setResumeEditOnCancel] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [sectionDraft, setSectionDraft] = useState<string[]>(DEFAULT_WEEKLY_SECTIONS);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionIndex, setNewSectionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSectionSaving, setIsSectionSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toastState = useToastState();
  const { showApiError, showValidationError } = useGlobalToast();
  const { height: screenHeight } = useWindowDimensions();
  const handleBack = useCallback(() => {
    router.push(routes.weeklyPlanner);
  }, []);

  const handleGenerateList = useCallback(async () => {
    if (!planId) {
      showValidationError('Missing weekly plan.');
      return;
    }

    setIsGenerating(true);
    try {
      const list = await shoppingListsApi.create({ weeklyPlanId: planId }, { mode: 'replace' });
      router.push(routes.shoppingListDetail(list.id));
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showApiError(uiErr, 'Generate failed');
    } finally {
      setIsGenerating(false);
    }
  }, [planId, showApiError, showValidationError]);

  const requestGenerateList = useCallback(async () => {
    if (!planId) {
      showValidationError('Missing weekly plan.');
      return;
    }
    try {
      const activeLists = await shoppingListsApi.list('active');
      const active = activeLists[0];
      if (!active || active.itemCount === 0) {
        await handleGenerateList();
        return;
      }
      setConfirmGenerateOpen(true);
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      showApiError(uiErr, 'Generate failed');
    }
  }, [handleGenerateList, planId, showApiError, showValidationError]);

  const actionItems = useMemo(
    () => [
      {
        key: 'generate',
        label: 'Generate List',
        icon: (
          <ShoppingBasket
            size={TAB_BAR.ICON_SIZE}
            color={theme.colors.textOnPrimary}
            strokeWidth={2.25}
          />
        ),
        onPress: requestGenerateList,
        disabled: isGenerating,
      },
      {
        key: 'clear',
        label: 'Clear Week',
        icon: (
          <XCircle size={TAB_BAR.ICON_SIZE} color={theme.colors.textOnPrimary} strokeWidth={2.25} />
        ),
        onPress: () => setConfirmClearWeekOpen(true),
      },
    ],
    [isGenerating, requestGenerateList],
  );

  const centerAction = useMemo(
    () => ({
      label: 'Add Section',
      icon: <Plus color={theme.colors.textOnPrimary} size={38} strokeWidth={2.75} />,
      onPress: () => setAddSectionOpen(true),
      accessibilityLabel: 'Add Section',
    }),
    [],
  );

  useBottomBarActions(
    isFocused ? actionItems : null,
    isFocused ? { mode: 'notched-actions', centerAction } : undefined,
  );

  const dayTabs = useMemo(() => (plan ? buildWeekDays(plan.weeklyStart) : []), [plan]);

  const activeDayMeta = useMemo(
    () => dayTabs.find((day) => day.key === activeDay) ?? null,
    [activeDay, dayTabs],
  );

  const sheetDayLabel = useMemo(() => {
    if (!activeDayMeta) return '';
    const label = activeDayMeta.label.toLowerCase();
    const shortLabel = label.charAt(0).toUpperCase() + label.slice(1, 3);
    return `${shortLabel} ${activeDayMeta.dateLabel}`;
  }, [activeDayMeta]);

  const filteredRecipes = useMemo(() => {
    const query = recipeSearch.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter((recipe) => recipe.title.toLowerCase().includes(query));
  }, [recipeSearch, recipes]);

  const isCurrentWeek = plan?.weeklyStart === currentWeekStartIso();
  const title = plan
    ? (() => {
        if (isCurrentWeek) return 'Current Week';
        const current = currentWeekStartIso();
        const currentDate = new Date(`${current}T00:00:00Z`);
        const planDate = new Date(`${plan.weeklyStart}T00:00:00Z`);
        const diffDays = Math.round((planDate.getTime() - currentDate.getTime()) / 86400000);
        if (diffDays === 7) return 'Next Week';
        if (diffDays === -7) return 'Previous Week';
        return formatWeekRange(plan.weeklyStart);
      })()
    : 'Weekly Plan';

  const todayKey = useMemo(() => {
    if (!isCurrentWeek) return null;
    const now = new Date();
    const dayIndex = (now.getUTCDay() + 6) % 7;
    const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return labels[dayIndex] ?? null;
  }, [isCurrentWeek]);

  const planSections = useMemo(
    () => (plan?.sections && plan.sections.length > 0 ? plan.sections : DEFAULT_WEEKLY_SECTIONS),
    [plan],
  );

  const sectionOptions = useMemo(() => {
    if (!editSection) return planSections;
    const exists = planSections.some(
      (section) => section.toLowerCase() === editSection.toLowerCase(),
    );
    return exists ? planSections : [...planSections, editSection];
  }, [editSection, planSections]);

  useEffect(() => {
    if (!plan) return;
    if (activeDay) return;
    if (pendingDay) {
      setActiveDay(pendingDay);
      return;
    }
    setActiveDay(dayTabs[0]?.key ?? 'MON');
  }, [activeDay, dayTabs, pendingDay, plan]);

  useEffect(() => {
    didOpenPendingEntry.current = false;
  }, [pendingEntryId, planId]);

  useEffect(() => {
    if (!pendingDay || didApplyPendingDay.current) return;
    setActiveDay(pendingDay);
    didApplyPendingDay.current = true;
  }, [pendingDay]);

  useEffect(() => {
    if (planSections.length === 0) return;
    setAddSection((prev) =>
      prev && planSections.some((section) => section.toLowerCase() === prev.toLowerCase())
        ? prev
        : planSections[0],
    );
  }, [planSections]);

  useEffect(() => {
    if (!addSectionOpen) return;
    setSectionDraft(planSections);
    setSelectedSection(null);
    setNewSectionTitle('');
    setNewSectionIndex(planSections.length);
  }, [addSectionOpen, planSections]);

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const list = await recipesApi.list();
        setRecipes(list);
      } catch {
        setRecipes([]);
      }
    };
    loadRecipes();
  }, []);

  useEffect(() => {
    if (!toastState.toast || !isFocused) {
      setShowToast(false);
      return;
    }
    setShowToast(true);
  }, [isFocused, toastState.toast]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const recipesById = useMemo(() => {
    return new Map(recipes.map((recipe) => [recipe.id, recipe]));
  }, [recipes]);

  const entriesForDay = useMemo(() => {
    if (!plan || !activeDay) return [];
    return plan.entries.filter((entry) => entry.day.trim().toUpperCase() === activeDay);
  }, [activeDay, plan]);

  const editEntry = useMemo(() => {
    if (!plan || !editEntryId) return null;
    return plan.entries.find((entry) => entry.id === editEntryId) ?? null;
  }, [editEntryId, plan]);

  const editDayMeta = useMemo(
    () => dayTabs.find((day) => day.key === editDay) ?? null,
    [dayTabs, editDay],
  );

  const editDayLabel = useMemo(() => {
    const map: Record<string, string> = {
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      THU: 'Thursday',
      FRI: 'Friday',
      SAT: 'Saturday',
      SUN: 'Sunday',
    };
    return map[editDay] ?? editDay;
  }, [editDay]);

  const editDayOptions = useMemo(() => {
    const map: Record<string, string> = {
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      THU: 'Thursday',
      FRI: 'Friday',
      SAT: 'Saturday',
      SUN: 'Sunday',
    };
    return dayTabs.map((day) => ({
      label: map[day.key] ?? day.label,
      value: day.key,
    }));
  }, [dayTabs]);

  const editRecipe = useMemo(() => {
    if (!editEntry?.recipeId) return null;
    return recipesById.get(editEntry.recipeId) ?? null;
  }, [editEntry, recipesById]);

  const editSubtitle = useMemo(() => {
    if (!editDayMeta) return '';
    const label = editDayMeta.label.toLowerCase();
    const shortLabel = label.charAt(0).toUpperCase() + label.slice(1, 3);
    return `${shortLabel} ${editDayMeta.dateLabel} - ${editSection}`;
  }, [editDayMeta, editSection]);

  const editEntryTitle = useMemo(() => {
    if (editTab === 'recipes') {
      return editRecipe?.title ?? 'Meal';
    }
    return editTitle || editEntry?.customTitle || 'Meal';
  }, [editEntry?.customTitle, editRecipe?.title, editTab, editTitle]);

  const sectionDraftWithPlaceholder = useMemo(() => {
    const safeIndex = Math.max(0, Math.min(newSectionIndex, sectionDraft.length));
    const next = [...sectionDraft];
    next.splice(safeIndex, 0, SECTION_DRAFT_ID);
    return next;
  }, [newSectionIndex, sectionDraft]);

  const handleAddSectionDraft = useCallback(() => {
    const nextTitle = newSectionTitle.trim();
    if (!nextTitle) return;
    const exists = sectionDraft.some(
      (section) => section.trim().toLowerCase() === nextTitle.toLowerCase(),
    );
    if (exists) {
      setNewSectionTitle('');
      return;
    }
    setSectionDraft((prev) => {
      const insertAt = Math.max(0, Math.min(newSectionIndex, prev.length));
      const next = [...prev];
      next.splice(insertAt, 0, nextTitle);
      return next;
    });
    setNewSectionIndex((prev) => prev + 1);
    setNewSectionTitle('');
  }, [newSectionIndex, newSectionTitle, sectionDraft]);

  const buildNextSections = useCallback(() => {
    const trimmedDraft = sectionDraft.map((section) => section.trim()).filter(Boolean);
    const nextTitle = newSectionTitle.trim();
    const combined = [...trimmedDraft];
    if (nextTitle) {
      const insertAt = Math.max(0, Math.min(newSectionIndex, combined.length));
      combined.splice(insertAt, 0, nextTitle);
    }
    const nextSections: string[] = [];
    const seen = new Set<string>();
    combined.forEach((section) => {
      const key = section.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      nextSections.push(section);
    });
    return nextSections;
  }, [newSectionIndex, newSectionTitle, sectionDraft]);

  const handleSectionSave = useCallback(async () => {
    if (!plan) return;
    const nextSections = buildNextSections();
    if (nextSections.length === 0) return;
    const nextSectionKeys = new Set(nextSections.map((section) => section.toLowerCase()));
    const nextEntries = plan.entries
      .filter((entry) => nextSectionKeys.has(entry.section.trim().toLowerCase()))
      .map(toEntryInput);
    setIsSectionSaving(true);
    try {
      const updated = await weeklyPlansApi.patch(plan.id, {
        sections: nextSections,
        entries: nextEntries,
      });
      setPlan(updated);
      setAddSectionOpen(false);
      toastState.show({ variant: 'success', message: 'Sections updated.' });
    } finally {
      setIsSectionSaving(false);
    }
  }, [buildNextSections, plan, setPlan, toastState]);

  const handleSectionDelete = useCallback(() => {
    if (!selectedSection) return;
    const targetKey = selectedSection.toLowerCase();
    const nextSections = sectionDraft.filter((section) => section.toLowerCase() !== targetKey);
    if (nextSections.length === 0) return;
    setSectionDraft(nextSections);
    setSelectedSection(null);
    setNewSectionIndex((prev) => Math.min(prev, nextSections.length));
    setAddSection((prev) =>
      prev && prev.toLowerCase() === targetKey ? (nextSections[0] ?? '') : prev,
    );
  }, [sectionDraft, selectedSection]);

  const handleSectionSelect = useCallback((section: string) => {
    if (section === SECTION_DRAFT_ID) return;
    setSelectedSection((prev) =>
      prev && prev.toLowerCase() === section.toLowerCase() ? null : section,
    );
  }, []);

  const handleSectionDragEnd = useCallback(({ data }: SectionDragPayload) => {
    const placeholderIndex = data.indexOf(SECTION_DRAFT_ID);
    const nextSections = data.filter((item) => item !== SECTION_DRAFT_ID);
    setSectionDraft(nextSections);
    setNewSectionIndex(placeholderIndex === -1 ? nextSections.length : placeholderIndex);
  }, []);

  const entryDeleteDescription = useMemo(() => {
    const subtitle = editSubtitle ? ` from ${editSubtitle}` : '';
    return `Remove ${editEntryTitle}${subtitle}?`;
  }, [editEntryTitle, editSubtitle]);

  const clearWeekDescription = useMemo(() => {
    if (!plan) {
      return 'This will remove all meals and reset sections to Breakfast, Lunch, and Dinner.';
    }
    const label = formatWeekRange(plan.weeklyStart);
    return `This will remove all meals from ${label} and reset sections to Breakfast, Lunch, and Dinner.`;
  }, [plan]);

  const generateDescription = useMemo(() => {
    if (!plan) {
      return 'This will replace your active shopping list with items from this week.';
    }
    const label = formatWeekRange(plan.weeklyStart);
    return `This will replace your active shopping list with items from ${label}.`;
  }, [plan]);

  const resetAddForm = useCallback(() => {
    setSelectedRecipeId(null);
    setCustomTitle('');
    setItemInput('');
    setItems([]);
    setFormError(null);
  }, []);

  const openAddSheet = useCallback(
    (section: string) => {
      setAddSection(section);
      resetAddForm();
      setAddOpen(true);
    },
    [resetAddForm],
  );

  const handleAddItem = useCallback(() => {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, trimmed]);
    setItemInput('');
  }, [itemInput]);

  const handleEditItemAdd = useCallback(() => {
    const trimmed = editItemInput.trim();
    if (!trimmed) return;
    setEditItems((prev) => [...prev, trimmed]);
    setEditItemInput('');
  }, [editItemInput]);

  const handleEditExtraAdd = useCallback(() => {
    const trimmed = editExtraInput.trim();
    if (!trimmed) return;
    setEditExtraItems((prev) => [...prev, trimmed]);
    setEditExtraInput('');
  }, [editExtraInput]);

  const openEditSheet = useCallback(
    (entry: WeeklyPlanEntry) => {
      setEditEntryId(entry.id);
      setEditItemInput('');
      setEditExtraInput('');
      setEditDay(entry.day);
      setEditSection(entry.section);
      const recipeForEntry = entry.recipeId ? recipesById.get(entry.recipeId) : null;
      const fallbackPortions =
        entry.portions !== null && entry.portions !== undefined
          ? entry.portions
          : (recipeForEntry?.portions ?? 1);
      setEditPortions(String(Math.max(1, fallbackPortions)));
      if (entry.recipeId) {
        setEditTab('recipes');
        setEditExtraItems(entry.extraItems ?? []);
        setEditTitle('');
        setEditItems([]);
      } else {
        setEditTab('custom');
        setEditTitle(entry.customTitle ?? '');
        setEditItems(entry.items ?? []);
        setEditExtraItems([]);
      }
      setEditOpen(true);
    },
    [recipesById],
  );

  useEffect(() => {
    if (!plan || !pendingEntryId || didOpenPendingEntry.current) return;
    const entry = plan.entries.find((item) => item.id === pendingEntryId);
    if (!entry) return;
    didOpenPendingEntry.current = true;
    setActiveDay(entry.day);
    openEditSheet(entry);
  }, [openEditSheet, pendingEntryId, plan]);

  const handleEditSave = useCallback(async () => {
    if (!plan || !editEntry) return;

    const portionsValue = Number(editPortions);
    const nextPortions =
      Number.isFinite(portionsValue) && portionsValue > 0 ? portionsValue : undefined;

    const nextEntries = plan.entries.map((entry): WeeklyPlanEntryInput => {
      if (entry.id !== editEntry.id) return toEntryInput(entry);
      if (editTab === 'recipes') {
        return {
          ...toEntryInput(entry),
          day: editDay,
          section: editSection,
          recipeId: entry.recipeId ?? undefined,
          customTitle: undefined,
          items: undefined,
          portions: nextPortions,
          extraItems: editExtraItems,
        };
      }
      return {
        ...toEntryInput(entry),
        day: editDay,
        section: editSection,
        customTitle: editTitle.trim() || entry.customTitle || undefined,
        items: editItems,
        recipeId: undefined,
        extraItems: undefined,
        portions: undefined,
      };
    });

    setIsSaving(true);
    try {
      const updated = await weeklyPlansApi.patch(plan.id, { entries: nextEntries });
      setPlan(updated);
      setEditOpen(false);
      toastState.show({ variant: 'success', message: 'Meal updated.' });
    } finally {
      setIsSaving(false);
    }
  }, [
    editDay,
    editEntry,
    editExtraItems,
    editItems,
    editPortions,
    editSection,
    editTab,
    editTitle,
    plan,
    setPlan,
    toastState,
  ]);

  const handleEditDelete = useCallback(async () => {
    if (!plan || !editEntry) return;
    setIsSaving(true);
    try {
      const nextEntries = plan.entries
        .filter((entry) => entry.id !== editEntry.id)
        .map(toEntryInput);
      const updated = await weeklyPlansApi.patch(plan.id, { entries: nextEntries });
      setPlan(updated);
      setEditOpen(false);
      toastState.show({ variant: 'success', message: 'Meal removed.' });
    } finally {
      setIsSaving(false);
    }
  }, [editEntry, plan, setPlan, toastState]);

  const confirmEntryDelete = useCallback(async () => {
    setConfirmEntryDeleteOpen(false);
    setResumeEditOnCancel(false);
    await handleEditDelete();
  }, [handleEditDelete]);

  const confirmClearWeek = useCallback(async () => {
    if (!plan) {
      setConfirmClearWeekOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      const updated = await weeklyPlansApi.patch(plan.id, {
        entries: [],
        sections: DEFAULT_WEEKLY_SECTIONS,
      });
      setPlan(updated);
      toastState.show({ variant: 'success', message: 'Week cleared.' });
    } finally {
      setIsSaving(false);
      setConfirmClearWeekOpen(false);
    }
  }, [plan, setPlan, toastState]);

  const confirmGenerate = useCallback(async () => {
    setConfirmGenerateOpen(false);
    await handleGenerateList();
  }, [handleGenerateList]);

  const editActionItems = useMemo(() => {
    const items = [
      {
        key: 'cancel',
        label: 'Cancel',
        icon: (
          <XCircle color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />
        ),
        onPress: () => setEditOpen(false),
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: (
          <Trash2 color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />
        ),
        onPress: () => {
          setConfirmEntryDeleteOpen(true);
          setResumeEditOnCancel(true);
          setEditOpen(false);
        },
        disabled: isSaving,
      },
    ];

    if (editTab === 'recipes' && editEntry?.recipeId) {
      items.push({
        key: 'view',
        label: 'View Recipe',
        icon: (
          <ArrowUpRight
            color={theme.colors.textOnPrimary}
            size={TAB_BAR.ICON_SIZE}
            strokeWidth={2.25}
          />
        ),
        onPress: () => {
          if (!editEntry.recipeId) return;
          setEditOpen(false);
          if (!plan) {
            router.push(routes.recipe(editEntry.recipeId));
            return;
          }
          router.push(
            routes.recipeWithWeeklyPlanReturn(
              editEntry.recipeId,
              plan.id,
              editEntry.id,
              editEntry.day,
            ),
          );
        },
      });
    }

    items.push({
      key: 'save',
      label: 'Save',
      icon: (
        <Download color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />
      ),
      onPress: handleEditSave,
      disabled: isSaving,
    });

    return items;
  }, [editEntry?.day, editEntry?.id, editEntry?.recipeId, editTab, handleEditSave, isSaving, plan]);

  const sectionActionItems = useMemo(() => {
    const nextSections = buildNextSections();
    return [
      {
        key: 'delete',
        label: 'Delete',
        icon: (
          <Trash2 color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.25} />
        ),
        onPress: () => {
          if (!selectedSection) {
            toastState.show({ variant: 'info', message: 'Select a section to delete.' });
            return;
          }
          handleSectionDelete();
        },
        disabled: isSectionSaving || sectionDraft.length <= 1,
      },
      {
        key: 'save',
        label: 'Save',
        icon: (
          <Download
            color={theme.colors.textOnPrimary}
            size={TAB_BAR.ICON_SIZE}
            strokeWidth={2.25}
          />
        ),
        onPress: handleSectionSave,
        disabled: isSectionSaving || nextSections.length === 0,
      },
    ];
  }, [
    buildNextSections,
    handleSectionDelete,
    handleSectionSave,
    isSectionSaving,
    sectionDraft.length,
    selectedSection,
    toastState,
  ]);

  const handleSelectRecipe = useCallback((recipe: RecipeListItem) => {
    setSelectedRecipeId(recipe.id);
  }, []);

  const handleSaveEntry = useCallback(async () => {
    if (!plan || !activeDay) return;
    setFormError(null);

    if (addTab === 'recipes' && !selectedRecipeId) {
      setFormError('Select a recipe first.');
      return;
    }
    if (addTab === 'custom' && !customTitle.trim()) {
      setFormError('Custom item needs a title.');
      return;
    }

    const baseEntry: WeeklyPlanEntryInput = {
      day: activeDay,
      section: addSection,
    };

    const entry: WeeklyPlanEntryInput =
      addTab === 'recipes'
        ? { ...baseEntry, recipeId: selectedRecipeId ?? undefined }
        : { ...baseEntry, customTitle: customTitle.trim(), items };

    setIsSaving(true);
    try {
      const updated = await weeklyPlansApi.patch(plan.id, {
        entries: [...plan.entries.map(toEntryInput), entry],
      });
      setPlan(updated);
      setAddOpen(false);
      toastState.show({ variant: 'success', message: 'Meal added.' });
    } catch (e) {
      setFormError('Could not save entry. Please try again.');
      const uiErr = mapCommonError(toApiError(e));
      showApiError(uiErr, 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [
    activeDay,
    addSection,
    addTab,
    customTitle,
    items,
    plan,
    selectedRecipeId,
    setPlan,
    showApiError,
    toastState,
  ]);

  const contentPaddingBottom = TAB_BAR.BOX_HEIGHT + TAB_BAR.PADDING_TOP + 40;

  const state = useMemo<WeeklyPlanDetailsState>(
    () => ({
      plan,
      isLoading,
      error,
      title,
      isRefreshing,
      isSaving,
      isSectionSaving,
      isGenerating,
      screenHeight,
      contentPaddingBottom,
    }),
    [
      plan,
      isLoading,
      error,
      title,
      isRefreshing,
      isSaving,
      isSectionSaving,
      isGenerating,
      screenHeight,
      contentPaddingBottom,
    ],
  );

  const actions = useMemo<WeeklyPlanDetailsActions>(
    () => ({
      load,
      handleBack,
      handleRefresh,
      openAddSheet,
      openEditSheet,
      requestGenerateList,
    }),
    [load, handleBack, handleRefresh, openAddSheet, openEditSheet, requestGenerateList],
  );

  const toast = useMemo<WeeklyPlanDetailsToast>(
    () => ({
      state: toastState,
      showToast,
      topInset: insets.top,
    }),
    [toastState, showToast, insets.top],
  );

  const dayPicker = useMemo<WeeklyPlanDetailsDayPicker>(
    () => ({
      dayTabs,
      activeDay,
      setActiveDay,
      todayKey,
    }),
    [dayTabs, activeDay, setActiveDay, todayKey],
  );

  const data = useMemo<WeeklyPlanDetailsData>(
    () => ({
      planSections,
      entriesForDay,
      recipesById,
      recipes,
      filteredRecipes,
      sectionOptions,
    }),
    [planSections, entriesForDay, recipesById, recipes, filteredRecipes, sectionOptions],
  );

  const addSheet = useMemo<WeeklyPlanDetailsAddSheet>(
    () => ({
      open: addOpen,
      setOpen: setAddOpen,
      tab: addTab,
      setTab: setAddTab,
      sheetDayLabel,
      addSection,
      recipeSearch,
      setRecipeSearch,
      selectedRecipeId,
      handleSelectRecipe,
      customTitle,
      setCustomTitle,
      itemInput,
      setItemInput,
      handleAddItem,
      items,
      setItems,
      formError,
      handleSaveEntry,
    }),
    [
      addOpen,
      setAddOpen,
      addTab,
      setAddTab,
      sheetDayLabel,
      addSection,
      recipeSearch,
      setRecipeSearch,
      selectedRecipeId,
      handleSelectRecipe,
      customTitle,
      setCustomTitle,
      itemInput,
      setItemInput,
      handleAddItem,
      items,
      setItems,
      formError,
      handleSaveEntry,
    ],
  );

  const editSheet = useMemo<WeeklyPlanDetailsEditSheet>(
    () => ({
      open: editOpen,
      setOpen: setEditOpen,
      tab: editTab,
      editRecipe,
      editTitle,
      setEditTitle,
      editSubtitle,
      editDay,
      setEditDay,
      editDayLabel,
      editDayOptions,
      editSection,
      setEditSection,
      editPortions,
      setEditPortions,
      editPickerOpen,
      setEditPickerOpen,
      editItemInput,
      setEditItemInput,
      handleEditItemAdd,
      editItems,
      setEditItems,
      editExtraInput,
      setEditExtraInput,
      handleEditExtraAdd,
      editExtraItems,
      setEditExtraItems,
      actionItems: editActionItems,
      resumeEditOnCancel,
      setResumeEditOnCancel,
    }),
    [
      editOpen,
      setEditOpen,
      editTab,
      editRecipe,
      editTitle,
      setEditTitle,
      editSubtitle,
      editDay,
      setEditDay,
      editDayLabel,
      editDayOptions,
      editSection,
      setEditSection,
      editPortions,
      setEditPortions,
      editPickerOpen,
      setEditPickerOpen,
      editItemInput,
      setEditItemInput,
      handleEditItemAdd,
      editItems,
      setEditItems,
      editExtraInput,
      setEditExtraInput,
      handleEditExtraAdd,
      editExtraItems,
      setEditExtraItems,
      editActionItems,
      resumeEditOnCancel,
      setResumeEditOnCancel,
    ],
  );

  const sectionSheet = useMemo<WeeklyPlanDetailsSectionSheet>(
    () => ({
      open: addSectionOpen,
      setOpen: setAddSectionOpen,
      newSectionTitle,
      setNewSectionTitle,
      handleAddSectionDraft,
      sectionDraftWithPlaceholder,
      handleSectionDragEnd,
      handleSectionSelect,
      selectedSection,
      actionItems: sectionActionItems,
    }),
    [
      addSectionOpen,
      setAddSectionOpen,
      newSectionTitle,
      setNewSectionTitle,
      handleAddSectionDraft,
      sectionDraftWithPlaceholder,
      handleSectionDragEnd,
      handleSectionSelect,
      selectedSection,
      sectionActionItems,
    ],
  );

  const confirms = useMemo<WeeklyPlanDetailsConfirms>(
    () => ({
      entryDeleteOpen: confirmEntryDeleteOpen,
      setEntryDeleteOpen: setConfirmEntryDeleteOpen,
      confirmEntryDelete,
      clearWeekOpen: confirmClearWeekOpen,
      setClearWeekOpen: setConfirmClearWeekOpen,
      confirmClearWeek,
      generateOpen: confirmGenerateOpen,
      setGenerateOpen: setConfirmGenerateOpen,
      confirmGenerate,
      generateDescription,
      entryDeleteDescription,
      clearWeekDescription,
    }),
    [
      confirmGenerate,
      confirmGenerateOpen,
      confirmEntryDeleteOpen,
      setConfirmEntryDeleteOpen,
      confirmEntryDelete,
      confirmClearWeekOpen,
      setConfirmClearWeekOpen,
      confirmClearWeek,
      generateDescription,
      entryDeleteDescription,
      clearWeekDescription,
    ],
  );

  return useMemo<WeeklyPlanDetailsView>(
    () => ({
      state,
      actions,
      toast,
      dayPicker,
      data,
      addSheet,
      editSheet,
      sectionSheet,
      confirms,
    }),
    [state, actions, toast, dayPicker, data, addSheet, editSheet, sectionSheet, confirms],
  );
}
