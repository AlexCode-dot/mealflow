import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Card, Button, ErrorText } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { useEditRecipe } from '@/src/features/recipes/hooks/useEditRecipe';

export function EditRecipeScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const form = useEditRecipe(id);

  const onSave = async () => {
    const ok = await form.save();
    if (ok) router.back();
  };

  const headerRight = (
    <Button
      title={form.isSaving ? 'Saving…' : 'Save'}
      variant="primary"
      onPress={onSave}
      disabled={!form.canSave}
    />
  );

  return (
    <Screen title="Edit recipe" showBack showProfileIcon={false} rightSlot={headerRight} scroll>
      <Card>
        <Text style={styles.sectionTitle}>Basic</Text>

        <View style={{ gap: theme.spacing.s3 }}>
          <View style={{ gap: theme.spacing.s2 }}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={form.title}
              onChangeText={(v) => form.setTitle(v)}
              onBlur={() => form.setTitleTouched(true)}
              placeholder="e.g. Chicken pasta"
              style={[styles.input, form.titleError ? styles.inputInvalid : null]}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            {form.titleError ? <ErrorText>{form.titleError}</ErrorText> : null}
          </View>

          <View style={{ gap: theme.spacing.s2 }}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => form.setDescription(v)}
              placeholder="Short description (optional)"
              style={[styles.input, styles.multiline]}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <Text style={styles.hint}>One ingredient per line (for now).</Text>

        <TextInput
          value={form.ingredientsText}
          onChangeText={form.setIngredientsText}
          placeholder={'e.g.\nChicken\nPasta\nCream'}
          style={[styles.input, styles.multilineTall]}
          multiline
          textAlignVertical="top"
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Steps</Text>
        <Text style={styles.hint}>One step per line.</Text>

        <TextInput
          value={form.stepsText}
          onChangeText={form.setStepsText}
          placeholder={'e.g.\nBoil pasta\nCook chicken\nMix sauce'}
          style={[styles.input, styles.multilineTall]}
          multiline
          textAlignVertical="top"
        />
      </Card>

      {form.loadError ? (
        <Card>
          <ErrorText>{form.loadError}</ErrorText>
          <View style={{ height: theme.spacing.s3 }} />
          <Button title="Try again" onPress={form.load} />
        </Card>
      ) : null}

      {form.saveError ? (
        <Card>
          <ErrorText>{form.saveError}</ErrorText>
        </Card>
      ) : null}

      <View style={{ gap: theme.spacing.s3 }}>
        <Button
          title={form.isSaving ? 'Saving…' : 'Save changes'}
          variant="primary"
          onPress={onSave}
          disabled={!form.canSave}
        />
        <Button title="Cancel" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  hint: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputInvalid: { borderColor: theme.colors.error, backgroundColor: theme.colors.errorBg },
  multiline: { minHeight: 90 },
  multilineTall: { minHeight: 140 },
});
