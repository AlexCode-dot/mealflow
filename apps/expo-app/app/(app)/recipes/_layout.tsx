// ===== FILE: apps/expo-app/app/(app)/recipes/_layout.tsx =====
import { Stack } from 'expo-router';

export default function RecipesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="voice" />
      <Stack.Screen name="search" />
      <Stack.Screen name="import" />
      <Stack.Screen name="import/[jobId]" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="inspiration/[id]" />
    </Stack>
  );
}
