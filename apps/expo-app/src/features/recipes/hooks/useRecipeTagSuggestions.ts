import { useEffect, useState } from 'react';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';

/**
 * Tags the user has already used, offered as one-tap suggestions in the editor. Failures are
 * swallowed — suggestions are a convenience, and typing a tag by hand always works.
 */
export function useRecipeTagSuggestions(): string[] {
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    recipesApi
      .tags()
      .then((result) => {
        if (active) setTags(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return tags;
}
