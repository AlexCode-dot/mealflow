import { useEffect, useMemo, useRef, useState } from 'react';

export type StepItem = {
  id: string;
  text: string;
};

type Args = {
  steps: string[];
  setSteps: (next: string[]) => void;
};

export function useStepReorderState({ steps, setSteps }: Args) {
  const [ids, setIds] = useState<string[]>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    setIds((prev) => {
      const used = new Set<string>();
      const next: string[] = [];

      const nextId = () => {
        let id = '';
        do {
          idCounter.current += 1;
          id = `step-${idCounter.current}`;
        } while (used.has(id));
        return id;
      };

      for (let i = 0; i < steps.length; i += 1) {
        const existing = prev[i];
        const id = existing && !used.has(existing) ? existing : nextId();
        used.add(id);
        next.push(id);
      }

      return next;
    });
  }, [steps.length]);

  const items = useMemo<StepItem[]>(
    () => steps.map((text, idx) => ({ id: ids[idx] ?? `step-temp-${idx}`, text })),
    [steps, ids],
  );

  const onDragEnd = (data: StepItem[]) => {
    setSteps(data.map((entry) => entry.text));
    setIds((prev) => {
      const used = new Set<string>();
      const next: string[] = [];

      const nextId = () => {
        let id = '';
        do {
          idCounter.current += 1;
          id = `step-${idCounter.current}`;
        } while (used.has(id));
        return id;
      };

      data.forEach((entry, index) => {
        const fallback = prev[index];
        const id = entry.id && !used.has(entry.id) ? entry.id : (fallback ?? nextId());
        used.add(id);
        next.push(id);
      });

      return next;
    });
  };

  return { items, onDragEnd };
}
