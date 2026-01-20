# Frontend Conventions

## Hook Return Structure

Use the grouped view model pattern for feature-level screens/hooks where there is lots of state
and actions to expose.

### When to use
- Hook returns ~8+ values, or
- Hook is the primary data source for a screen (feature-level screen)

### When not to use
- Small hooks with only a few values
- UI-only helpers where a simple return keeps it readable

### Pattern
- Return grouped, memoized objects:
  - `state`: read-only data for rendering
  - `actions`: user actions / callbacks
  - `data`: computed lists / derived data
  - `form`: form inputs + setters (if applicable)
  - `toast`, `dayPicker`, `addSheet`, `editSheet`, `sectionSheet`, `confirms` as needed

### Example
```ts
type ExampleView = {
  state: { isLoading: boolean; error: string | null };
  actions: { load: () => Promise<void> };
  data: { items: Item[] };
};

export function useExampleScreen(): ExampleView {
  const state = useMemo(() => ({ isLoading, error }), [isLoading, error]);
  const actions = useMemo(() => ({ load }), [load]);
  const data = useMemo(() => ({ items }), [items]);

  return useMemo(() => ({ state, actions, data }), [state, actions, data]);
}
```
