import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { ScrollView, TextInput } from 'react-native';
import { useKeyboardInset } from '@/src/shared/hooks/useKeyboardInset';
import { useScrollToFocusedInput } from '@/src/shared/hooks/useScrollToFocusedInput';

type Options = {
  screenHeight: number;
  defaultKeyboardOffset?: number;
  desiredGap?: number;
};

export function useFocusedInputSheetAdjustment(
  scrollRef: RefObject<ScrollView | null>,
  { screenHeight, defaultKeyboardOffset = 12, desiredGap = 16 }: Options,
) {
  const keyboardInset = useKeyboardInset();
  const scrollToFocusedInput = useScrollToFocusedInput(scrollRef, defaultKeyboardOffset);
  const activeInputRef = useRef<RefObject<TextInput | null> | null>(null);
  const activeKeyboardOffset = useRef(defaultKeyboardOffset);
  const [extraHeight, setExtraHeight] = useState(0);

  const updateActiveInput = useCallback(() => {
    const inputRef = activeInputRef.current;
    const input = inputRef?.current;
    if (!input) {
      setExtraHeight(0);
      return;
    }

    input.measureInWindow((_x, y, _width, height) => {
      if (keyboardInset <= 0) {
        setExtraHeight(0);
        scrollToFocusedInput(inputRef, activeKeyboardOffset.current);
        return;
      }

      const keyboardTop = screenHeight - keyboardInset;
      const inputBottom = y + height;
      const overflow = Math.max(0, inputBottom + desiredGap - keyboardTop);

      setExtraHeight(overflow);
      requestAnimationFrame(() => {
        scrollToFocusedInput(inputRef, activeKeyboardOffset.current + overflow);
      });
    });
  }, [desiredGap, keyboardInset, screenHeight, scrollToFocusedInput]);

  useEffect(() => {
    if (!activeInputRef.current) {
      setExtraHeight(0);
      return;
    }

    requestAnimationFrame(updateActiveInput);
  }, [keyboardInset, updateActiveInput]);

  const focusInput = useCallback(
    (inputRef: RefObject<TextInput | null>, keyboardOffset = defaultKeyboardOffset) => {
      activeInputRef.current = inputRef;
      activeKeyboardOffset.current = keyboardOffset;
      requestAnimationFrame(updateActiveInput);
    },
    [defaultKeyboardOffset, updateActiveInput],
  );

  const clearFocus = useCallback(() => {
    activeInputRef.current = null;
    activeKeyboardOffset.current = defaultKeyboardOffset;
    setExtraHeight(0);
  }, [defaultKeyboardOffset]);

  return {
    focusInput,
    clearFocus,
    extraHeight,
  };
}
