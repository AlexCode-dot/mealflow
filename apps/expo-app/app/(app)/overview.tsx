import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, ListRow, Chip } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';

export default function OverviewScreen() {
  return (
    <Screen title="Overview">
      <Card>
        <Text style={styles.cardTitle}>This week</Text>
        <View style={styles.chips}>
          <Chip label="Planner" selected />
          <Chip label="Recipes" />
          <Chip label="Shopping" />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Quick actions</Text>

        <View style={styles.rows}>
          <ListRow
            title="Generate shopping list"
            subtitle="From your weekly plan"
            onPress={() => {}}
          />
          <ListRow title="Plan this week" subtitle="Pick meals for each day" onPress={() => {}} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rows: {
    gap: 10,
  },
});
