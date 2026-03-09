import { useCallback, type RefObject } from 'react';
import type { ScrollView, TextInput } from 'react-native';

export function useScrollToFocusedInput(
  scrollRef: RefObject<ScrollView | null>,
  defaultKeyboardOffset = 12,
) {
  return useCallback(
    (inputRef: RefObject<TextInput | null>, keyboardOffset = defaultKeyboardOffset) => {
      requestAnimationFrame(() => {
        const scrollNode = (scrollRef.current as any)?.getNode?.() ?? scrollRef.current;
        const responder = scrollNode?.getScrollResponder?.();
        const input = inputRef.current;
        if (!responder || !input) return;
        responder.scrollResponderScrollNativeHandleToKeyboard(input, keyboardOffset, true);
      });
    },
    [defaultKeyboardOffset, scrollRef],
  );
}
