import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { useOverviewScreen } from '@/src/features/overview/hooks/useOverviewScreen';
import { buildWeekDays } from '@/src/features/weekly-plans/utils/weeklyPlanDates';
import { WeekStrip } from '@/src/features/weekly-plans/ui/WeekStrip';

export default function OverviewScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return Platform.OS === 'web' ? (
    <OverviewScreenWeb theme={theme} styles={styles} />
  ) : (
    <OverviewScreenNative theme={theme} styles={styles} />
  );
}

type OverviewScreenProps = {
  theme: Theme;
  styles: ReturnType<typeof createStyles>;
};

function OverviewScreenNative({ theme, styles }: OverviewScreenProps) {
  const { t } = useTranslation();
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

  return (
    <OverviewScreenLayout
      state={state}
      data={data}
      actions={actions}
      theme={theme}
      styles={styles}
      carouselNode={
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
                      {[item.category, item.area].filter(Boolean).join(' · ') || t('overview.discoverRecipe')}
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
      }
      dotsNode={
        <View style={styles.carouselDots}>
          <Pagination.Basic
            progress={progress}
            data={data.inspiration}
            dotStyle={styles.carouselDot}
            activeDotStyle={styles.carouselDotActive}
            containerStyle={styles.carouselDotRow}
          />
        </View>
      }
    />
  );
}

function OverviewScreenWeb({ theme, styles }: OverviewScreenProps) {
  const { t } = useTranslation();
  const { state, data, actions } = useOverviewScreen();
  useBottomBarActions(null);
  const { width } = useWindowDimensions();
  const [carouselWidth, setCarouselWidth] = useState(width);

  const carousel = useMemo(() => {
    const cardWidth = Math.min(carouselWidth * 0.82, 340);
    const cardHeight = Math.round(cardWidth * 0.7);
    const containerHeight = Math.round(cardHeight * 1.12);
    return { cardWidth, cardHeight, containerHeight };
  }, [carouselWidth]);

  return (
    <OverviewScreenLayout
      state={state}
      data={data}
      actions={actions}
      theme={theme}
      styles={styles}
      carouselNode={
        <View
          onLayout={(event) => {
            const measuredWidth = Math.round(event.nativeEvent.layout.width);
            if (measuredWidth && measuredWidth !== carouselWidth) {
              setCarouselWidth(measuredWidth);
            }
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.carouselScroll, { height: carousel.containerHeight }]}
          >
            {data.inspiration.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.carouselItemWrap,
                  { width: carouselWidth, height: carousel.containerHeight },
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
                      {[item.category, item.area].filter(Boolean).join(' · ') || t('overview.discoverRecipe')}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      }
      dotsNode={null}
    />
  );
}

type OverviewLayoutProps = {
  state: ReturnType<typeof useOverviewScreen>['state'];
  data: ReturnType<typeof useOverviewScreen>['data'];
  actions: ReturnType<typeof useOverviewScreen>['actions'];
  carouselNode: ReactNode;
  dotsNode: ReactNode | null;
};

function OverviewScreenLayout({
  state,
  data,
  actions,
  carouselNode,
  dotsNode,
  theme,
  styles,
}: OverviewLayoutProps & OverviewScreenProps) {
  const { t } = useTranslation();
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
      title={t('overview.title')}
      scroll
      contentStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
      }
    >
      <View style={styles.carouselSection}>
        {hasInspiration ? (
          carouselNode
        ) : (
          <SectionEmpty
            title={t('overview.noInspirationYet')}
            description={t('overview.noInspirationBody')}
            actionLabel={t('overview.findNewRecipes')}
            onAction={actions.openDiscovery}
            actionIcon={<Flame size={16} color={theme.colors.primaryDark} />}
          />
        )}

        {hasInspiration ? dotsNode : null}

        <View style={styles.carouselFooter}>
          <Pressable
            onPress={actions.openDiscovery}
            style={({ pressed }) => [styles.findCard, pressed ? styles.findCardPressed : null]}
          >
            <View style={styles.findContent}>
              <Text style={styles.findTitle}>{t('overview.findNewRecipes')}</Text>
              <Text style={styles.findSubtitle}>{t('overview.browseInspirationCatalog')}</Text>
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
            <Text style={styles.sectionTitle}>{t('overview.weeklyPlanner')}</Text>
            <Text style={styles.sectionSubtitle}>{data.weekRangeLabel}</Text>
          </View>
          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>{t('overview.weekLabel', { n: data.weekNumber })}</Text>
          </View>
        </View>

        <Text style={styles.heroPlanned}>{t('overview.plannedMeals', { count: data.plannedCount })}</Text>
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
              {hasPlan ? t('overview.openWeeklyPlan') : t('overview.planThisWeek')}
            </Text>
            <Text style={styles.weeklyCtaSubtitle}>
              {hasPlan ? t('overview.seeMealsAndAdjust') : t('overview.startPlanningWeek')}
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textOnPrimary} strokeWidth={2.8} />
        </Pressable>
      </Card>

      <Card style={styles.sectionSpacing}>
        <Text style={styles.sectionTitle}>{t('overview.quickActions')}</Text>
        <View style={styles.quickRows}>
          <ListRow
            title={t('overview.addARecipe')}
            subtitle={t('overview.createRecipeFromScratch')}
            onPress={actions.openNewRecipe}
            right={<ChevronRight size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />}
          />
          <ListRow
            title={t('overview.browseRecipes')}
            subtitle={t('overview.seeSavedRecipes')}
            onPress={actions.openRecipes}
            right={<ChevronRight size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />}
          />
          {data.activeListId ? (
            <ListRow
              title={data.activeListTitle}
              subtitle={t('overview.shoppingListItems', { count: data.activeItemCount })}
              onPress={actions.openActiveList}
              right={<ChevronRight size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />}
            />
          ) : (
            <ListRow
              title={t('overview.openShoppingList')}
              subtitle={t('overview.viewCurrentOrArchived')}
              onPress={actions.openShoppingList}
              right={<ChevronRight size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />}
            />
          )}
        </View>
      </Card>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: theme.spacing.s4,
    },
    carouselSection: {
      gap: theme.spacing.s3,
    },
    carousel: {
      alignSelf: 'center',
    },
    carouselContainer: {
      alignItems: 'center',
    },
    carouselScroll: {
      alignItems: 'center',
      paddingVertical: theme.spacing.s2,
    },
    carouselItemWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    carouselCard: {
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
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
      backgroundColor: theme.colors.surface,
    },
    carouselFade: {
      ...StyleSheet.absoluteFillObject,
    },
    carouselText: {
      position: 'absolute',
      left: theme.spacing.s4,
      right: theme.spacing.s4,
      bottom: theme.spacing.s4,
    },
    carouselTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },
    carouselSubtitle: {
      color: 'rgba(255,255,255,0.85)',
      marginTop: 4,
    },
    carouselDots: {
      alignItems: 'center',
    },
    carouselDotRow: {
      gap: 6,
    },
    carouselDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
      opacity: 0.6,
    },
    carouselDotActive: {
      width: 18,
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    carouselFooter: {
      marginTop: theme.spacing.s2,
    },
    findCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.s3,
      paddingHorizontal: theme.spacing.s4,
    },
    findCardPressed: {
      opacity: 0.9,
    },
    findContent: {
      flex: 1,
    },
    findTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
    },
    findSubtitle: {
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    findChevronWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionSpacing: {
      gap: theme.spacing.s3,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
    },
    sectionSubtitle: {
      marginTop: 2,
      color: theme.colors.textMuted,
    },
    weekBadge: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    weekBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text,
    },
    heroPlanned: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    weeklyCta: {
      marginTop: theme.spacing.s2,
      borderRadius: 14,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.s3,
      paddingHorizontal: theme.spacing.s4,
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
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textOnPrimary,
    },
    weeklyCtaSubtitle: {
      marginTop: 4,
      color: 'rgba(255,255,255,0.75)',
    },
    quickRows: {
      gap: theme.spacing.s2,
    },
  });
