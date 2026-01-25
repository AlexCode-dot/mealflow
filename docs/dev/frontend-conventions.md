# Frontend Conventions

## Expo Router – keep route files thin

Routes under `apps/expo-app/app/` should do as little as possible:

- Prefer re-exporting a feature screen, e.g. `app/(app)/overview.tsx` →
  `features/overview/screens/OverviewScreen`.
- If a route needs small wiring (navigation props, layout, flags), keep it
  minimal and delegate logic to hooks and screen components.

This keeps routing concerns separate from feature logic and avoids duplicate
state management across routes.

## Separate UI from logic (hooks as view models)

Feature screens should load data and actions via hooks, then render UI using
the returned view model.

Pattern in this repo:

- Screens call a `use*Screen` hook (e.g. `useOverviewScreen`,
  `useWeeklyPlannerScreen`, `useRecipesScreen`).
- Hooks encapsulate data loading, mutation, and derived state.
- UI components receive data/handlers as props and stay presentation-focused.

This makes screens easier to test, reduces re-renders, and keeps logic close
to the feature that owns it.

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
