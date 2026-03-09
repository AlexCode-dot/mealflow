import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

type KeyboardOpenTiming = 'auto' | 'will' | 'did';

export function useKeyboardOpen(timing: KeyboardOpenTiming = 'auto') {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const useWillEvents = timing === 'will' || (timing === 'auto' && Platform.OS === 'ios');
    const showEvent = useWillEvents ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = useWillEvents ? 'keyboardWillHide' : 'keyboardDidHide';
    const handleKeyboardShow = (event: KeyboardEvent) => {
      if (Platform.OS === 'ios' && useWillEvents) {
        Keyboard.scheduleLayoutAnimation(event);
      }
      setIsKeyboardOpen(true);
    };
    const handleKeyboardHide = (event: KeyboardEvent) => {
      if (Platform.OS === 'ios' && useWillEvents) {
        Keyboard.scheduleLayoutAnimation(event);
      }
      setIsKeyboardOpen(false);
    };
    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [timing]);

  return isKeyboardOpen;
}
