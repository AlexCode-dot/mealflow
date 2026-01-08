import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, ListRow, Button, ErrorText } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';
import { useRecipesList } from '@/src/features/recipes/hooks/useRecipesList';

export function RecipesScreen() {
  const { items, isLoading, error, load, refreshControl } = useRecipesList();

  const headerRight = (
    <Button title="New" variant="secondary" onPress={() => router.push(routes.recipeNew)} />
  );

  return (
    <Screen title="Recipes" rightSlot={headerRight} scroll refreshControl={refreshControl}>
      {error ? (
        <Card>
          <ErrorText>{error}</ErrorText>
          <View style={{ height: theme.spacing.s3 }} />
          <Button title="Try again" onPress={load} />
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <Text style={styles.muted}>Loading recipes…</Text>
        </Card>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <Card>
          <Text style={styles.title}>No recipes yet</Text>
          <Text style={styles.muted}>
            Create your first recipe to start building your cookbook.
          </Text>

          <View style={{ height: theme.spacing.s3 }} />
          <Button
            title="Create recipe"
            variant="primary"
            onPress={() => router.push(routes.recipeNew)}
          />
        </Card>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Saved recipes</Text>

          <View style={styles.rows}>
            {items.map((r) => (
              <ListRow
                key={r.id}
                title={r.title}
                subtitle={r.description ?? (r.fromExternal ? 'External recipe' : 'My recipe')}
                onPress={() => router.push(routes.recipe(r.id))}
              />
            ))}
          </View>

          <View style={{ height: theme.spacing.s3 }} />
          <Text style={styles.hint}>Pull down to refresh.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  muted: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  hint: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  rows: { gap: 10 },
});
