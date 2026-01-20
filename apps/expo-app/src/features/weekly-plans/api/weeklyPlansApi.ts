import { httpClient } from '@/src/core/http/httpClient';
import type {
  CreateWeeklyPlanRequest,
  UpdateWeeklyPlanRequest,
  WeeklyPlan,
  WeeklyPlanListItem,
} from '@/src/features/weekly-plans/types';

export const weeklyPlansApi = {
  list(weeklyStart?: string): Promise<WeeklyPlanListItem[]> {
    const query = weeklyStart ? `?weeklyStart=${encodeURIComponent(weeklyStart)}` : '';
    return httpClient.appApi.get<WeeklyPlanListItem[]>(`/api/weekly-plans${query}`);
  },

  get(id: string): Promise<WeeklyPlan> {
    return httpClient.appApi.get<WeeklyPlan>(`/api/weekly-plans/${id}`);
  },

  create(body: CreateWeeklyPlanRequest): Promise<WeeklyPlan> {
    return httpClient.appApi.post<WeeklyPlan>('/api/weekly-plans', body);
  },

  patch(id: string, body: UpdateWeeklyPlanRequest): Promise<WeeklyPlan> {
    return httpClient.appApi.patch<WeeklyPlan>(`/api/weekly-plans/${id}`, body);
  },

  replace(id: string, body: CreateWeeklyPlanRequest): Promise<WeeklyPlan> {
    return httpClient.appApi.put<WeeklyPlan>(`/api/weekly-plans/${id}`, body);
  },

  remove(id: string): Promise<void> {
    return httpClient.appApi.delete<void>(`/api/weekly-plans/${id}`);
  },
};
