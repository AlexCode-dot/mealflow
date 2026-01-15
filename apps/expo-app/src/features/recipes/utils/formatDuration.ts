export function formatDuration(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '—';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes}min`;
}
