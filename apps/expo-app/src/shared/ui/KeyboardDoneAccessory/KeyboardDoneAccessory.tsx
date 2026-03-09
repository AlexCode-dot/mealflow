import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  nativeID: string;
};

export function KeyboardDoneAccessory({ nativeID }: Props) {
  const styles = useThemedStyles(createStyles);

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.accessory}>
        <Pressable onPress={Keyboard.dismiss} style={styles.button}>
          <Text style={styles.label}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    accessory: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
      borderTopWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
    },
    button: {
      paddingHorizontal: theme.spacing.s2,
      paddingVertical: theme.spacing.s1,
    },
    label: {
      color: theme.colors.primaryDark,
      fontSize: 16,
      fontWeight: '700',
    },
  });
