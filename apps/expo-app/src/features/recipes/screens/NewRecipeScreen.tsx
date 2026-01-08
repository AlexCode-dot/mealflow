import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, TextField, Button, ErrorText } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { routes } from '@/src/core/navigation/routes';
import { useCreateRecipe } from '@/src/features/recipes/hooks/useCreateRecipe';

export function NewRecipeScreen() {
  const form = useCreateRecipe();

  const submit = async () => {
    const id = await form.submit();
    if (id) router.replace(routes.recipe(id));
  };

  return (
    <Screen title="New recipe" showBack scroll showProfileIcon={false}>
      <Card>
        <Text style={styles.sectionTitle}>Basics</Text>

        <View style={{ gap: 12 }}>
          <TextField
            label="Title"
            value={form.title}
            onChangeText={(v) => form.setTitle(v)}
            placeholder="e.g. Chicken stir-fry"
            returnKeyType="next"
            onBlur={() => form.setTouched((t) => ({ ...t, title: true }))}
            invalid={form.touched.title && Boolean(form.errors.title)}
          />
          {form.touched.title && form.errors.title ? (
            <ErrorText>{form.errors.title}</ErrorText>
          ) : null}

          <TextField
            label="Description (optional)"
            value={form.description}
            onChangeText={(v) => form.setDescription(v)}
            placeholder="Short notes, links, or what makes it good…"
            returnKeyType="done"
            onBlur={() => form.setTouched((t) => ({ ...t, description: true }))}
            invalid={form.touched.description && Boolean(form.errors.description)}
            onSubmitEditing={submit}
          />
          {form.touched.description && form.errors.description ? (
            <ErrorText>{form.errors.description}</ErrorText>
          ) : null}

          {form.serverError ? <ErrorText>{form.serverError}</ErrorText> : null}

          <Button
            title={form.isSaving ? 'Saving...' : 'Create recipe'}
            variant="primary"
            onPress={submit}
            disabled={!form.canSubmit}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.hintTitle}>Next</Text>
        <Text style={styles.hintText}>
          After creating the recipe, you can add ingredients and steps on the details/edit screen.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  hintTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  hintText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
