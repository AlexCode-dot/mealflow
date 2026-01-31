import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/src/shared/theme/theme';
import { WEB, isWeb } from '@/src/shared/ui/webStyles';

type Props = {
  children: ReactNode;
};

export function WebFrame({ children }: Props) {
  const { width } = useWindowDimensions();
  const useFramedShell = isWeb ? width >= WEB.frameMaxWidth + WEB.shellPadding * 2 : false;

  const Shell = isWeb ? LinearGradient : View;
  const shellProps = isWeb
    ? {
        colors: [theme.colors.primaryDark, theme.colors.bgLight],
        start: { x: 0.2, y: 0 },
        end: { x: 0.8, y: 1 },
      }
    : {};

  return (
    <Shell
      {...shellProps}
      style={[
        styles.shell,
        isWeb && styles.shellWeb,
        isWeb && !useFramedShell && styles.shellWebFullBleed,
      ]}
    >
      {isWeb ? <ShellBackdrop /> : null}
      <View
        style={[
          styles.frame,
          isWeb && styles.frameWeb,
          isWeb && !useFramedShell && styles.frameWebFullBleed,
        ]}
      >
        {children}
        {isWeb ? <FadeEdges /> : null}
      </View>
    </Shell>
  );
}

function ShellBackdrop() {
  return (
    <View style={[styles.shellBackdrop, { pointerEvents: 'none' }]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']}
        locations={[0, 0.4, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.shellGlow}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
        locations={[0, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.shellMist}
      />
    </View>
  );
}

function FadeEdges() {
  return (
    <View style={[styles.fadeLayer, { pointerEvents: 'none' }]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.fadeEdge, styles.fadeTop]}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.fadeEdge, styles.fadeBottom]}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fadeEdge, styles.fadeLeft]}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fadeEdge, styles.fadeRight]}
      />
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
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  shellBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  shellGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  shellMist: {
    ...StyleSheet.absoluteFillObject,
  },
  fadeLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  fadeEdge: {
    position: 'absolute',
  },
  fadeTop: {
    left: 0,
    right: 0,
    top: 0,
    height: 36,
  },
  fadeBottom: {
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
  },
  fadeLeft: {
    top: 0,
    bottom: 0,
    left: 0,
    width: 36,
  },
  fadeRight: {
    top: 0,
    bottom: 0,
    right: 0,
    width: 36,
  },
  frameWebFullBleed: {
    maxWidth: '100%',
    borderRadius: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
});
