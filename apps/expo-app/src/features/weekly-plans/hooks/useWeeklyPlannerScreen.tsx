import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { weeklyPlansApi } from '@/src/features/weekly-plans/api/weeklyPlansApi';
import type { WeeklyPlan } from '@/src/features/weekly-plans/types';
import { routes } from '@/src/core/navigation/routes';
import { useWeeklyPlansList } from '@/src/features/weekly-plans/hooks/useWeeklyPlansList';
import type { UiError } from '@/src/shared/errors/errorTypes';
import {
  buildWeekDays,
  currentWeekStartIso,
  formatWeekRange,
  getIsoWeekNumber,
  parseIsoDate,
} from '@/src/features/weekly-plans/utils/weeklyPlanDates';

export type WeeklyPlannerTab = 'recent' | 'window' | 'created';

export type WeeklyPlannerListItem = {
  key: string;
  title: string;
  rangeLabel: string;
  mealCount?: number;
  isCurrent: boolean;
  mode: 'summary' | 'upcoming';
  statusLabel?: string;
  hasPlan?: boolean;
  onPress: () => void;
};

export type WeeklyPlannerState = {
  isLoading: boolean;
  error: UiError | null;
  refreshControl: ReturnType<typeof useWeeklyPlansList>['refreshControl'];
  tab: WeeklyPlannerTab;
  isCreating: boolean;
};

export type WeeklyPlannerActions = {
  reload: () => Promise<void>;
  setTab: (tab: WeeklyPlannerTab) => void;
};

export type WeeklyPlannerHeaderView = {
  title: string;
  rangeLabel: string;
  plannedCount: number;
  weekDays: ReturnType<typeof buildWeekDays>;
  dayMealCounts: Record<string, number>;
  activeDayKey: string | null;
  weekOffset: number;
  onPrev: () => void;
  onNext: () => void;
  onOpen: () => Promise<void>;
  isCreating: boolean;
  hasPlan: boolean;
};

export type WeeklyPlannerView = {
  state: WeeklyPlannerState;
  actions: WeeklyPlannerActions;
  header: WeeklyPlannerHeaderView;
  listItems: WeeklyPlannerListItem[];
};

export function useWeeklyPlannerScreen(): WeeklyPlannerView {
  const { items, isLoading, error, load, refreshControl } = useWeeklyPlansList();
  const [tab, setTab] = useState<WeeklyPlannerTab>('recent');
  const [isCreating, setIsCreating] = useState(false);

  const baseWeekStart = useMemo(() => currentWeekStartIso(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const shiftWeekStart = useCallback((start: string, weeks: number) => {
    const date = parseIsoDate(start);
    date.setUTCDate(date.getUTCDate() + weeks * 7);
    return date.toISOString().slice(0, 10);
  }, []);

  const selectedWeekStart = useMemo(
    () => shiftWeekStart(baseWeekStart, weekOffset),
    [baseWeekStart, shiftWeekStart, weekOffset],
  );
  const selectedWeek = useMemo(() => buildWeekDays(selectedWeekStart), [selectedWeekStart]);
  const selectedPlan = useMemo(
    () => items.find((item) => item.weeklyStart === selectedWeekStart) ?? null,
    [items, selectedWeekStart],
  );
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<WeeklyPlan | null>(null);

  const isCurrentWeek = weekOffset === 0;
  const weekTitle = useMemo(() => {
    if (weekOffset === -1) return 'Previous week';
    if (weekOffset === 1) return 'Next week';
    if (weekOffset !== 0) {
      return `Week ${getIsoWeekNumber(selectedWeekStart)}`;
    }
    return 'This Week';
  }, [selectedWeekStart, weekOffset]);

  const activeDayKey = useMemo(() => {
    if (!isCurrentWeek) {
      return null;
    }
    const now = new Date();
    const day = (now.getUTCDay() + 6) % 7;
    const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return labels[day] ?? null;
  }, [isCurrentWeek]);

  const loadSelectedPlan = useCallback(async () => {
    if (!selectedPlan?.id) {
      setSelectedPlanDetails(null);
      return;
    }
    try {
      const plan = await weeklyPlansApi.get(selectedPlan.id);
      setSelectedPlanDetails(plan);
    } catch {
      setSelectedPlanDetails(null);
    }
  }, [selectedPlan?.id]);

  useEffect(() => {
    loadSelectedPlan();
  }, [loadSelectedPlan]);

  const dayMealCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!selectedPlanDetails) return counts;
    for (const entry of selectedPlanDetails.entries) {
      counts[entry.day] = (counts[entry.day] ?? 0) + 1;
    }
    return counts;
  }, [selectedPlanDetails]);

  const itemsByWeekStart = useMemo(() => {
    return new Map(items.map((item) => [item.weeklyStart, item]));
  }, [items]);

  const uniqueItems = useMemo(() => {
    const byWeek = new Map<string, (typeof items)[number]>();
    for (const item of items) {
      const existing = byWeek.get(item.weeklyStart);
      if (!existing) {
        byWeek.set(item.weeklyStart, item);
        continue;
      }
      const currentUpdated = Date.parse(item.updatedAt);
      const existingUpdated = Date.parse(existing.updatedAt);
      if (currentUpdated >= existingUpdated) {
        byWeek.set(item.weeklyStart, item);
      }
    }
    return Array.from(byWeek.values());
  }, [items]);

  const recentItems = useMemo(() => {
    return [...uniqueItems]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 5);
  }, [uniqueItems]);

  const allCreatedItems = useMemo(() => {
    return [...uniqueItems].sort(
      (a, b) => parseIsoDate(b.weeklyStart).getTime() - parseIsoDate(a.weeklyStart).getTime(),
    );
  }, [uniqueItems]);

  const weekWindowItems = useMemo(() => {
    return Array.from({ length: 8 }, (_, idx) => {
      const weekStart = shiftWeekStart(baseWeekStart, idx);
      const plan = itemsByWeekStart.get(weekStart) ?? null;
      return {
        id: plan?.id ?? null,
        weeklyStart: weekStart,
        entryCount: plan?.entryCount ?? 0,
      };
    });
  }, [baseWeekStart, itemsByWeekStart, shiftWeekStart]);

  const handleOpenListWeek = useCallback(
    async (weeklyStart: string, planId?: string | null) => {
      if (planId) {
        router.push(routes.weeklyPlan(planId));
        return;
      }
      setIsCreating(true);
      try {
        const created = await weeklyPlansApi.create({ weeklyStart, entries: [] });
        router.push(routes.weeklyPlan(created.id));
      } catch {
        await load();
      } finally {
        setIsCreating(false);
      }
    },
    [load],
  );

  const handleOpenWeek = useCallback(async () => {
    if (selectedPlan) {
      router.push(routes.weeklyPlan(selectedPlan.id));
      return;
    }

    setIsCreating(true);
    try {
      const created = await weeklyPlansApi.create({ weeklyStart: selectedWeekStart, entries: [] });
      router.push(routes.weeklyPlan(created.id));
    } catch {
      await load();
    } finally {
      setIsCreating(false);
    }
  }, [load, selectedPlan, selectedWeekStart]);

  const handlePrevWeek = useCallback(() => {
    setWeekOffset((prev) => Math.max(-2, prev - 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((prev) => Math.min(2, prev + 1));
  }, []);

  const listItems: WeeklyPlannerListItem[] = useMemo(() => {
    const buildSummary = (item: { id: string; weeklyStart: string; entryCount: number }) => {
      const weekNumber = getIsoWeekNumber(item.weeklyStart);
      const isCurrent = item.weeklyStart === baseWeekStart;
      return {
        key: item.id,
        title: isCurrent ? 'This week' : `Week ${weekNumber}`,
        rangeLabel: formatWeekRange(item.weeklyStart),
        mealCount: item.entryCount,
        isCurrent,
        mode: 'summary' as const,
        onPress: () => handleOpenListWeek(item.weeklyStart, item.id),
      };
    };

    if (tab === 'recent') {
      return recentItems.map(buildSummary);
    }

    if (tab === 'created') {
      return allCreatedItems.map(buildSummary);
    }

    return weekWindowItems.map((item) => {
      const weekNumber = getIsoWeekNumber(item.weeklyStart);
      const isCurrent = item.weeklyStart === baseWeekStart;
      const hasPlan = Boolean(item.id);
      return {
        key: `${item.weeklyStart}-${item.id ?? 'new'}`,
        title: isCurrent ? 'This week' : `Week ${weekNumber}`,
        rangeLabel: formatWeekRange(item.weeklyStart),
        isCurrent,
        mode: 'upcoming' as const,
        statusLabel: hasPlan ? 'Planned' : 'Empty',
        hasPlan,
        onPress: () => handleOpenListWeek(item.weeklyStart, item.id),
      };
    });
  }, [allCreatedItems, baseWeekStart, handleOpenListWeek, recentItems, tab, weekWindowItems]);

  const state = useMemo<WeeklyPlannerState>(
    () => ({
      isLoading,
      error,
      refreshControl,
      tab,
      isCreating,
    }),
    [isLoading, error, refreshControl, tab, isCreating],
  );

  const actions = useMemo<WeeklyPlannerActions>(
    () => ({
      reload: load,
      setTab,
    }),
    [load, setTab],
  );

  const header = useMemo<WeeklyPlannerHeaderView>(
    () => ({
      title: weekTitle,
      rangeLabel: formatWeekRange(selectedWeekStart),
      plannedCount: selectedPlan?.entryCount ?? 0,
      weekDays: selectedWeek,
      dayMealCounts,
      activeDayKey,
      weekOffset,
      onPrev: handlePrevWeek,
      onNext: handleNextWeek,
      onOpen: handleOpenWeek,
      isCreating,
      hasPlan: Boolean(selectedPlan),
    }),
    [
      weekTitle,
      selectedWeekStart,
      selectedPlan,
      selectedWeek,
      dayMealCounts,
      activeDayKey,
      weekOffset,
      handlePrevWeek,
      handleNextWeek,
      handleOpenWeek,
      isCreating,
    ],
  );

  return useMemo(
    () => ({
      state,
      actions,
      header,
      listItems,
    }),
    [state, actions, header, listItems],
  );
}
