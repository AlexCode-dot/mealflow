export type WeeklyPlanEntry = {
  id: string;
  day: string;
  section: string;
  recipeId?: string | null;
  customTitle?: string | null;
  items: string[];
  extraItems: string[];
  notes?: string | null;
  portions?: number | null;
};

export type WeeklyPlan = {
  id: string;
  weeklyStart: string;
  sections: string[];
  entries: WeeklyPlanEntry[];
  createdAt: string;
  updatedAt: string;
};

export type WeeklyPlanListItem = {
  id: string;
  weeklyStart: string;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type WeeklyPlanEntryInput = {
  id?: string;
  day: string;
  section: string;
  recipeId?: string;
  customTitle?: string;
  items?: string[];
  extraItems?: string[];
  notes?: string;
  portions?: number;
};

export type CreateWeeklyPlanRequest = {
  weeklyStart: string;
  sections?: string[];
  entries?: WeeklyPlanEntryInput[];
};

export type UpdateWeeklyPlanRequest = {
  weeklyStart?: string;
  sections?: string[];
  entries?: WeeklyPlanEntryInput[];
};
