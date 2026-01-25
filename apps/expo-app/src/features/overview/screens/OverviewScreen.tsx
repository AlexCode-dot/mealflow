import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Flame } from 'lucide-react-native';
import Carousel, { Pagination, type ICarouselInstance } from 'react-native-reanimated-carousel';
import { useSharedValue } from 'react-native-reanimated';
import {
  Card,
  ListRow,
  LoadingScreen,
  Screen,
  SectionEmpty,
  useBottomBarActions,
} from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { useOverviewScreen } from '@/src/features/overview/hooks/useOverviewScreen';
import { buildWeekDays } from '@/src/features/weekly-plans/utils/weeklyPlanDates';
import { WeekStrip } from '@/src/features/weekly-plans/ui/WeekStrip';

export default function OverviewScreen() {
  const { state, data, actions } = useOverviewScreen();
  useBottomBarActions(null);
  const { width } = useWindowDimensions();
  const [layoutReady, setLayoutReady] = useState(false);
  const [carouselWidth, setCarouselWidth] = useState(width);
  const carouselRef = useRef<ICarouselInstance>(null);
  const progress = useSharedValue(0);

  const carousel = useMemo(() => {
    const cardWidth = Math.min(carouselWidth * 0.82, 340);
    const cardHeight = Math.round(cardWidth * 0.7);
    const containerHeight = Math.round(cardHeight * 1.12);
    return { cardWidth, cardHeight, containerHeight };
  }, [carouselWidth]);
  const itemWidth = carouselWidth;
  const initialIndex = Math.max(0, Math.floor(data.inspiration.length / 2));

  useEffect(() => {
    if (!data.inspiration.length || !layoutReady) return;
    progress.value = initialIndex;
    requestAnimationFrame(() => {
      carouselRef.current?.scrollTo({ index: initialIndex, animated: false });
    });
  }, [data.inspiration.length, initialIndex, layoutReady, progress]);

  const hasPlan = Boolean(data.planId);
  const hasInspiration = data.inspiration.length > 0;
  const weekDays = useMemo(() => buildWeekDays(data.weekStart), [data.weekStart]);
  const activeDayKey = useMemo(() => {
    const now = new Date();
    const index = (now.getUTCDay() + 6) % 7;
    return weekDays[index]?.key ?? null;
  }, [weekDays]);
  const dayMealCounts = data.dayMealCounts;

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Screen
      title="Overview"
      scroll
      contentStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
      }
    >
      <View style={styles.carouselSection}>
        {hasInspiration ? (
          <View
            onLayout={(event) => {
              const measuredWidth = Math.round(event.nativeEvent.layout.width);
              if (measuredWidth && measuredWidth !== carouselWidth) {
                setCarouselWidth(measuredWidth);
              }
              setLayoutReady(true);
            }}
          >
            <Carousel
              ref={carouselRef}
              style={[styles.carousel, { width: carouselWidth, height: carousel.containerHeight }]}
              data={data.inspiration}
              loop={data.inspiration.length > 1}
              itemWidth={itemWidth}
              defaultIndex={initialIndex}
              mode="parallax"
              modeConfig={{
                parallaxScrollingScale: 1.08,
                parallaxAdjacentItemScale: 0.88,
                parallaxScrollingOffset: 34,
              }}
              onProgressChange={(offset, absoluteProgress) => {
                progress.value = absoluteProgress;
              }}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.carouselItemWrap,
                    { width: itemWidth, height: carousel.containerHeight },
                  ]}
                >
                  <Pressable
                    onPress={() => actions.openInspiration(item.id)}
                    style={({ pressed }) => [
                      styles.carouselCard,
                      { width: carousel.cardWidth, height: carousel.cardHeight },
                      pressed ? styles.carouselPressed : null,
                    ]}
                  >
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.carouselImage} />
                    ) : (
                      <View style={styles.carouselImageFallback} />
                    )}
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
                      locations={[0, 0.55, 1]}
                      style={styles.carouselFade}
                    />
                    <View style={styles.carouselText}>
                      <Text style={styles.carouselTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.carouselSubtitle} numberOfLines={1}>
                        {[item.category, item.area].filter(Boolean).join(' · ') ||
                          'Discover recipe'}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              )}
              scrollAnimationDuration={420}
              panGestureHandlerProps={{ activeOffsetX: [-10, 10] }}
              containerStyle={styles.carouselContainer}
            />
          </View>
        ) : (
          <SectionEmpty
            title="No inspiration yet"
            description="Pull to refresh or head to discovery for more recipes."
            actionLabel="Find new recipes"
            onAction={actions.openDiscovery}
            actionIcon={<Flame size={16} color={theme.colors.primaryDark} />}
          />
        )}

        {hasInspiration ? (
          <View style={styles.carouselDots}>
            <Pagination.Basic
              progress={progress}
              data={data.inspiration}
              dotStyle={styles.carouselDot}
              activeDotStyle={styles.carouselDotActive}
              containerStyle={styles.carouselDotRow}
            />
          </View>
        ) : null}

        <View style={styles.carouselFooter}>
          <Pressable
            onPress={actions.openDiscovery}
            style={({ pressed }) => [styles.findCard, pressed ? styles.findCardPressed : null]}
          >
            <View style={styles.findContent}>
              <Text style={styles.findTitle}>Find new recipes</Text>
              <Text style={styles.findSubtitle}>Browse the full inspiration catalog</Text>
            </View>
            <View style={styles.findChevronWrap}>
              <ChevronRight size={20} color={theme.colors.primaryDark} strokeWidth={2.6} />
            </View>
          </Pressable>
        </View>
      </View>

      <Card style={styles.sectionSpacing}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Weekly planner</Text>
            <Text style={styles.sectionSubtitle}>{data.weekRangeLabel}</Text>
          </View>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>Week {data.weekNumber}</Text>
          </View>
        </View>

        <Text style={styles.heroPlanned}>Planned meals: {data.plannedCount}</Text>
        <WeekStrip
          weekDays={weekDays}
          dayMealCounts={dayMealCounts}
          activeDayKey={activeDayKey}
          tone="light"
          size="compact"
          spacing="tight"
          showDots
        />

        <Pressable
          onPress={actions.openWeeklyPlan}
          style={({ pressed }) => [styles.weeklyCta, pressed ? styles.weeklyCtaPressed : null]}
        >
          <View style={styles.weeklyCtaText}>
            <Text style={styles.weeklyCtaTitle}>
              {hasPlan ? 'Open weekly plan' : 'Plan this week'}
            </Text>
            <Text style={styles.weeklyCtaSubtitle}>
              {hasPlan ? 'See meals and adjust entries' : 'Start planning your week'}
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textOnPrimary} strokeWidth={2.8} />
        </Pressable>
      </Card>

      <Card style={styles.sectionSpacing}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickRows}>
          <ListRow
            title="Add a recipe"
            subtitle="Create a new recipe from scratch"
            onPress={actions.openNewRecipe}
            right={<ChevronRight size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />}
          />
          <ListRow
            title="Browse recipes"
            subtitle="See your saved recipes"
            onPress={actions.openRecipes}
            right={<ChevronRight size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />}
          />
          {data.activeListId ? (
            <ListRow
              title={data.activeListTitle}
              subtitle={`${data.activeItemCount} items in your active list`}
              onPress={actions.openActiveList}
              right={<ChevronRight size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />}
            />
          ) : (
            <ListRow
              title="Open shopping list"
              subtitle="View current list or archived lists"
              onPress={actions.openShoppingList}
              right={<ChevronRight size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />}
            />
          )}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.s4,
  },
  carouselSection: {
    marginHorizontal: -theme.spacing.s4,
    gap: theme.spacing.s3,
  },
  weekBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
  },
  weekBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.s3,
  },
  heroPlanned: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: -2,
  },
  statRow: {
    justifyContent: 'space-between',
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: theme.spacing.s2,
  },
  quickRows: {
    gap: theme.spacing.s2,
  },
  sectionSpacing: {
    marginTop: theme.spacing.s2,
  },
  findCard: {
    paddingVertical: theme.spacing.s4,
    paddingHorizontal: theme.spacing.s5,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  findCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  findContent: {
    flex: 1,
    gap: theme.spacing.s1,
    paddingRight: theme.spacing.s4,
  },
  findTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  findSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  findChevronWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  carousel: {
    height: 0,
  },
  carouselContainer: {
    paddingVertical: 0,
  },
  carouselItemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCard: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: theme.colors.bgLight,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  carouselPressed: {
    transform: [{ scale: 0.98 }],
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselImageFallback: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  carouselFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  carouselText: {
    position: 'absolute',
    left: theme.spacing.s3,
    right: theme.spacing.s3,
    bottom: theme.spacing.s3,
    gap: theme.spacing.s1,
  },
  carouselTitle: {
    color: theme.colors.surface,
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  carouselSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
  },
  carouselDots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
    marginTop: theme.spacing.s1,
    paddingHorizontal: theme.spacing.s4,
  },
  carouselDotRow: {
    gap: 8,
  },
  carouselDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(62,70,48,0.25)',
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: theme.colors.primaryDark,
  },
  carouselFooter: {
    paddingHorizontal: theme.spacing.s4,
  },
  weeklyCta: {
    marginTop: theme.spacing.s1,
    paddingVertical: theme.spacing.s4,
    paddingHorizontal: theme.spacing.s5,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyCtaPressed: {
    opacity: 0.92,
  },
  weeklyCtaText: {
    flex: 1,
    paddingRight: theme.spacing.s3,
  },
  weeklyCtaTitle: {
    color: theme.colors.textOnPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  weeklyCtaSubtitle: {
    color: theme.colors.iconMutedOnPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: theme.spacing.s1,
  },
});
