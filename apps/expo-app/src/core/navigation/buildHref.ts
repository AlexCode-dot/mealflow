import type { Href } from 'expo-router';

type ParamValue = string | number | boolean | undefined | null;
type Params = Record<string, ParamValue>;

export function buildHref(path: Href, params?: Params): Href {
  if (!params) return path;
  if (typeof path === 'string') {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      search.set(key, String(value));
    });
    const qs = search.toString();
    return (qs ? `${path}?${qs}` : path) as Href;
  }

  const mergedParams: Record<string, string> = {};
  const existing = path.params ?? {};
  Object.entries(existing).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    mergedParams[key] = String(value);
  });
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    mergedParams[key] = String(value);
  });

  return {
    pathname: path.pathname,
    params: mergedParams,
  } as Href;
}
