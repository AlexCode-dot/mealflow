export function formatRelativeTime(isoDate: string): string {
  const target = new Date(isoDate).getTime();
  if (Number.isNaN(target)) return 'recently';

  const diffMs = Date.now() - target;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute));
    return `${minutes} min ago`;
  }
  if (diffMs < day) {
    const hours = Math.round(diffMs / hour);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffMs < week) {
    const days = Math.round(diffMs / day);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (diffMs < month) {
    const weeks = Math.round(diffMs / week);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (diffMs < year) {
    const months = Math.round(diffMs / month);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.round(diffMs / year);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}
