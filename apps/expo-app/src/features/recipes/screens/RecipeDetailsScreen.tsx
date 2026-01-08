import { Alert, View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, Button, ErrorText, Chip } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';
import { useRecipeDetails } from '@/src/features/recipes/hooks/useRecipeDetails';

export function RecipeDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const { recipe, isLoading, error, load, remove, isDeleting } = useRecipeDetails(id);

  const onEdit = () => {
    if (!id) return;
    router.push(routes.recipeEdit(id));
  };

  const doDelete = async () => {
    const ok = await remove();
    if (ok) router.replace(routes.recipes);
  };

  const onDelete = () => {
    Alert.alert(
      'Delete recipe?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ],
      { cancelable: true },
    );
  };

  const headerRight = (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Button title="Edit" variant="secondary" onPress={onEdit} disabled={!recipe || isLoading} />
    </View>
  );

  return (
    <Screen
      title={isLoading ? 'Recipe' : (recipe?.title ?? 'Recipe')}
      showBack
      showProfileIcon={false}
      rightSlot={headerRight}
      scroll
    >
      {error ? (
        <Card>
          <ErrorText>{error}</ErrorText>
          <View style={{ height: theme.spacing.s3 }} />
          <Button title="Try again" onPress={load} />
        </Card>
      ) : null}

      {isLoading ? (
        <Card>
          <Text style={styles.muted}>Loading recipe…</Text>
        </Card>
      ) : null}

      {!isLoading && recipe ? (
        <>
          <Card>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{recipe.title}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label={recipe.fromExternal ? 'External' : 'My recipe'} selected />
              </View>
            </View>

            {recipe.description ? (
              <Text style={styles.description}>{recipe.description}</Text>
            ) : (
              <Text style={styles.muted}>No description</Text>
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Ingredients</Text>

            {recipe.ingredients?.length ? (
              <View style={{ gap: 8 }}>
                {recipe.ingredients.map((ing, idx) => (
                  <View key={`${ing.name}-${idx}`} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{ing.name}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>No ingredients yet</Text>
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Steps</Text>

            {recipe.steps?.length ? (
              <View style={{ gap: 10 }}>
                {recipe.steps.map((step, idx) => (
                  <View key={`${idx}-${step.slice(0, 12)}`} style={styles.stepRow}>
                    <View style={styles.stepIndex}>
                      <Text style={styles.stepIndexText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>No steps yet</Text>
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={{ gap: 10 }}>
              <Button title="Edit recipe" variant="secondary" onPress={onEdit} />
              <Button
                title={isDeleting ? 'Deleting…' : 'Delete recipe'}
                variant="danger"
                onPress={onDelete}
                disabled={isDeleting}
              />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { gap: 10 },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: '900', lineHeight: 26 },
  description: { color: theme.colors.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  muted: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { color: theme.colors.textMuted, fontSize: 16, lineHeight: 20, marginTop: 1 },
  bulletText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.bgLight,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepIndexText: { color: theme.colors.text, fontSize: 12, fontWeight: '900' },
  stepText: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
});
