import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
  /** Visual error state — red border on every box. */
  invalid?: boolean;
  onSubmit?: () => void;
};

/**
 * A clean N-digit code input. Renders N square boxes; behind them sits one real numeric
 * TextInput that captures keystrokes. Tapping any box focuses the input.
 */
export function OtpInput({
  value,
  onChangeText,
  length = 6,
  autoFocus = true,
  invalid = false,
  onSubmit,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const inputRef = useRef<TextInput | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  // Where the visual caret should sit — at the first empty box, or the last box when full.
  const activeIndex = Math.min(value.length, length - 1);

  const handleChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, length);
    onChangeText(cleaned);
    if (cleaned.length === length && onSubmit) {
      // Tiny defer so the last digit paints before parent navigates away.
      requestAnimationFrame(onSubmit);
    }
  };

  const focus = () => inputRef.current?.focus();

  return (
    <Pressable accessibilityLabel="Verification code" onPress={focus} style={styles.row}>
      {digits.map((digit, idx) => {
        const showCursor = isFocused && idx === activeIndex && digit === '';
        return (
          <View
            key={idx}
            style={[
              styles.box,
              isFocused && idx === activeIndex ? styles.boxActive : null,
              digit ? styles.boxFilled : null,
              invalid ? styles.boxInvalid : null,
            ]}
          >
            {digit ? (
              <Text style={styles.digit}>{digit}</Text>
            ) : showCursor ? (
              <View style={styles.cursor} />
            ) : null}
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        caretHidden
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        // Position the real input over the boxes but invisibly so it accepts input.
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const BOX_SIZE = 52;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'space-between',
    },
    box: {
      width: BOX_SIZE,
      height: BOX_SIZE,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxActive: {
      borderColor: theme.colors.primaryDark,
      borderWidth: 2,
    },
    boxFilled: {
      backgroundColor: theme.colors.bgLight,
      borderColor: theme.colors.borderNeutral,
    },
    boxInvalid: {
      borderColor: theme.colors.error,
    },
    digit: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    cursor: {
      width: 2,
      height: 22,
      backgroundColor: theme.colors.primaryDark,
      opacity: 0.6,
    },
    hiddenInput: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      opacity: 0,
    },
  });
