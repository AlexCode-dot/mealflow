import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { WeeklyPlanDayPicker } from '@/src/features/weekly-plans/ui/WeeklyPlanDayPicker';
import { WeeklyPlanEntryCard } from '@/src/features/weekly-plans/ui/WeeklyPlanEntryCard';
import {
  WeeklyPlanAddMealSheet,
  WeeklyPlanEditMealSheet,
  WeeklyPlanSectionEditorSheet,
} from '@/src/features/weekly-plans/ui/WeeklyPlanEditorSheets';
import { useWeeklyPlanDetailsScreen } from '@/src/features/weekly-plans/hooks/useWeeklyPlanDetailsScreen';
import {
  Card,
  ConfirmSheet,
  LoadingScreen,
  Screen,
  SectionEmpty,
  ToastBanner,
  useGlobalToast,
} from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

export default function WeeklyPlanDetailScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const view = useWeeklyPlanDetailsScreen();
  const { state, actions, toast, dayPicker, data, addSheet, editSheet, sectionSheet, confirms } =
    view;
  const { toast: globalToast } = useGlobalToast();
  const toastBanner =
    toast.state.toast && toast.showToast && !globalToast ? (
      <View style={[styles.toastOverlay, { pointerEvents: 'box-none' }]}>
        <View style={[styles.toastWrap, { marginTop: toast.topInset + 8, pointerEvents: 'none' }]}>
          <ToastBanner
            variant={toast.state.toast.variant}
            title={toast.state.toast.title}
            message={toast.state.toast.message}
            onTimeout={toast.state.clear}
          />
        </View>
      </View>
    ) : null;

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.root}>
      <Screen
        title={state.title}
        scroll
        showBack
        onBack={actions.handleBack}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
        }
        contentStyle={styles.screenContent}
      >
        <View style={[styles.contentWrap, { paddingBottom: state.contentPaddingBottom }]}>
          {state.plan ? (
            <WeeklyPlanDayPicker
              days={dayPicker.dayTabs}
              activeDay={dayPicker.activeDay}
              todayKey={dayPicker.todayKey}
              onSelect={dayPicker.setActiveDay}
            />
          ) : null}

          {data.planSections.map((section) => {
            const sectionEntries = data.entriesForDay.filter(
              (entry) => entry.section.trim().toLowerCase() === section.toLowerCase(),
            );
            return (
              <Card key={section} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.toUpperCase()}</Text>
                  <Pressable
                    onPress={() => actions.openAddSheet(section)}
                    style={({ pressed }) => [styles.addButton, pressed ? styles.addPressed : null]}
                  >
                    <Plus size={18} color={theme.colors.textOnPrimary} strokeWidth={2.4} />
                  </Pressable>
                </View>

                {sectionEntries.length === 0 ? (
                  <SectionEmpty
                    title="No meals yet"
                    description="Add your first meal to start building your plan."
                    actionLabel="Add meal"
                    onAction={() => actions.openAddSheet(section)}
                    actionIcon={
                      <Plus size={18} color={theme.colors.primaryDark} strokeWidth={2.4} />
                    }
                  />
                ) : (
                  <View style={styles.entryList}>
                    {sectionEntries.map((entry) => {
                      const recipe = entry.recipeId ? data.recipesById.get(entry.recipeId) : null;
                      return (
                        <WeeklyPlanEntryCard
                          key={entry.id}
                          entry={entry}
                          recipe={recipe}
                          onPress={() => actions.openEditSheet(entry)}
                        />
                      );
                    })}
                  </View>
                )}
              </Card>
            );
          })}

          <WeeklyPlanAddMealSheet
            visible={addSheet.open}
            onClose={() => addSheet.setOpen(false)}
            isSaving={state.isSaving}
            addSheet={addSheet}
            data={data}
          />

          <WeeklyPlanEditMealSheet
            visible={editSheet.open}
            onClose={() => editSheet.setOpen(false)}
            editSheet={editSheet}
            data={data}
          />

          <WeeklyPlanSectionEditorSheet
            visible={sectionSheet.open}
            onClose={() => sectionSheet.setOpen(false)}
            sectionSheet={sectionSheet}
          />

          <ConfirmSheet
            visible={confirms.entryDeleteOpen}
            title="Remove meal?"
            description={confirms.entryDeleteDescription}
            confirmLabel="Delete"
            onConfirm={confirms.confirmEntryDelete}
            onCancel={() => {
              confirms.setEntryDeleteOpen(false);
              if (editSheet.resumeEditOnCancel) {
                editSheet.setOpen(true);
                editSheet.setResumeEditOnCancel(false);
              }
            }}
            disabled={state.isSaving}
          />

          <ConfirmSheet
            visible={confirms.clearWeekOpen}
            title="Clear week?"
            description={confirms.clearWeekDescription}
            confirmLabel="Clear"
            onConfirm={confirms.confirmClearWeek}
            onCancel={() => confirms.setClearWeekOpen(false)}
            disabled={state.isSaving}
          />

          <ConfirmSheet
            visible={confirms.generateOpen}
            title="Generate shopping list?"
            description={confirms.generateDescription}
            confirmLabel="Generate"
            onConfirm={confirms.confirmGenerate}
            onCancel={() => confirms.setGenerateOpen(false)}
            disabled={state.isGenerating}
            confirmVariant="primary"
          />
        </View>
      </Screen>
      {toastBanner}
    </View>
  );
}
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    screenContent: {
      padding: 0,
      gap: 0,
    },
    contentWrap: {
      paddingHorizontal: theme.spacing.s3,
      paddingTop: theme.spacing.s3,
      paddingBottom: 140,
      gap: theme.spacing.s4,
    },
    toastOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
    },
    toastWrap: {
      alignSelf: 'stretch',
      marginHorizontal: theme.spacing.s3,
    },
    sectionCard: {
      gap: theme.spacing.s3,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.colors.primaryDark,
      letterSpacing: 0.5,
    },
    addButton: {
      height: 30,
      width: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPressed: {
      opacity: 0.85,
    },
    entryList: {
      gap: theme.spacing.s3,
    },
  });
