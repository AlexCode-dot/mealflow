import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { theme } from '@/src/shared/theme/theme';
import { WEB, isWeb } from '@/src/shared/ui/webStyles';

type Props = {
  children: ReactNode;
};

export function WebFrame({ children }: Props) {
  const { width } = useWindowDimensions();
  const useFramedShell = !isWeb ? false : width > WEB.frameMaxWidth + WEB.shellPadding * 2;

  return (
    <View
      style={[
        styles.shell,
        isWeb && styles.shellWeb,
        isWeb && !useFramedShell && styles.shellWebFullBleed,
      ]}
    >
      <View
        style={[
          styles.frame,
          isWeb && styles.frameWeb,
          isWeb && !useFramedShell && styles.frameWebFullBleed,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  shellWeb: {
    backgroundColor: theme.colors.primaryDark,
    paddingHorizontal: WEB.shellPadding,
    paddingVertical: WEB.shellPadding,
    alignItems: 'center',
  },
  shellWebFullBleed: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  frame: { flex: 1 },
  frameWeb: {
    width: '100%',
    maxWidth: WEB.frameMaxWidth,
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: 'rgba(0,0,0,0.28)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  frameWebFullBleed: {
    maxWidth: '100%',
    borderRadius: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
});
