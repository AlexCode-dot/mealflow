const MS_IN_DAY = 24 * 60 * 60 * 1000;

type WeekDay = {
  key: string;
  label: string;
  dateLabel: string;
};

export function parseIsoDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map((value) => Number(value));
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatWeekRange(weeklyStart: string): string {
  const start = parseIsoDate(weeklyStart);
  const end = new Date(start.getTime() + MS_IN_DAY * 6);
  const format = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  return `${format(start)} - ${format(end)}`;
}

export function getIsoWeekNumber(weeklyStart: string): number {
  const date = parseIsoDate(weeklyStart);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / MS_IN_DAY / 7);
}

export function buildWeekDays(weeklyStart: string): WeekDay[] {
  const start = parseIsoDate(weeklyStart);
  const labels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  return Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(start.getTime() + MS_IN_DAY * idx);
    const dateLabel = date.toLocaleDateString(undefined, {
      day: 'numeric',
      timeZone: 'UTC',
    });
    const key = labels[idx] ?? 'DAY';
    return { key, label: key, dateLabel };
  });
}

export function currentWeekStartIso(): string {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - day);
  return utc.toISOString().slice(0, 10);
}
