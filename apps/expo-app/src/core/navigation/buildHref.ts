import type { Href } from 'expo-router';

type Params = Record<string, string | undefined>;

export function buildHref(path: string, params?: Params): Href {
  if (!params) return path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const qs = search.toString();
  return (qs ? `${path}?${qs}` : path) as Href;
}
