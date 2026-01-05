import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memoryFallback = new Map<string, string>();

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return memoryFallback.get(key) ?? null;
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      memoryFallback.set(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      memoryFallback.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
