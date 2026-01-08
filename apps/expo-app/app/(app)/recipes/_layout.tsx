// ===== FILE: apps/expo-app/app/(app)/recipes/_layout.tsx =====
import { Stack } from 'expo-router';

export default function RecipesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/edit" />
    </Stack>
  );
}
