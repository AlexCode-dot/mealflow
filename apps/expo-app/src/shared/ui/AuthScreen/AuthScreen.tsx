import type { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/src/shared/theme/theme';
import { Card } from '@/src/shared/ui';
import { EnterFadeUp } from '@/src/shared/ui/animations';

type Props = {
  children: ReactNode;
  variant: 'login' | 'register';
  scroll?: boolean;
  bottomCta?: React.ReactNode;
};

export function AuthScreen({ children, variant, scroll = true, bottomCta }: Props) {
  const title = 'MealFlow';
  const subtitle =
    variant === 'login'
      ? 'Welcome back - let’s plan your week.'
      : 'Create your account to get started.';

  const Content = (
    <View style={styles.content}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>{title}</Text>
        <Text style={styles.brandSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.center}>
        <EnterFadeUp delayMs={60}>
          <Card variant="premium" style={[styles.card, styles.cardGlass]}>
            <View style={styles.cardInner}>{children}</View>
          </Card>
        </EnterFadeUp>
      </View>

      <View style={styles.bottomSpacer} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Base brand gradient */}
      <LinearGradient
        colors={[
          '#24381A', // richer top
          theme.colors.primaryDark,
          theme.colors.primary,
          theme.colors.primaryLight,
          theme.colors.bg,
        ]}
        locations={[0, 0.22, 0.52, 0.78, 1]}
        start={{ x: 0.15, y: 0.05 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Premium “light” at the top (very subtle) */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(245,241,230,0.10)', 'rgba(245,241,230,0)']}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Premium vignette (darken edges slightly) */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Tiny global overlay to unify everything */}
      <View pointerEvents="none" style={styles.overlay} />

      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {Content}
        </ScrollView>
      ) : (
        Content
      )}

      {bottomCta ?? null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },

  scrollContainer: {
    flexGrow: 1,
    padding: theme.spacing.s4,
  },

  content: {
    flexGrow: 1,
    minHeight: 520,
  },

  brand: {
    marginTop: theme.spacing.s6,
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    color: theme.colors.textOnPrimary,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    color: theme.colors.iconMutedOnPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: theme.spacing.s4,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: theme.spacing.s6,
    paddingBottom: theme.spacing.s6,
  },

  card: {
    padding: theme.spacing.s4,
  },

  // Auth-only “floating glass” feel
  cardGlass: {
    backgroundColor: 'rgba(247,243,232,0.74)',
    borderColor: 'rgba(207,200,183,0.52)',
  },

  cardInner: {
    gap: theme.spacing.s4,
  },

  bottomSpacer: {
    height: 120,
  },
});
