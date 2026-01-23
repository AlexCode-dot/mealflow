export function normalizePath(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.endsWith('/index') ? path.slice(0, -'/index'.length) : path;
}
