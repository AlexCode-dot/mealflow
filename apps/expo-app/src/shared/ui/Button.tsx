import { Pressable, Text } from 'react-native';

export function Button({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
        borderWidth: 1,
        borderColor: '#111',
      }}
    >
      <Text style={{ fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}
