import { secureStorage } from '../storage/secureStorage';

const REFRESH_KEY = 'mealflow.refreshToken';

let accessToken: string | null = null;

export const tokenStore = {
  // Access token (memory-only)
  getAccessToken(): string | null {
    return accessToken;
  },

  hasAccessToken(): boolean {
    return Boolean(accessToken);
  },

  setAccessToken(token: string): void {
    accessToken = token;
  },

  clearAccessToken(): void {
    accessToken = null;
  },

  // Refresh token (secure storage)
  async getRefreshToken(): Promise<string | null> {
    return secureStorage.getItem(REFRESH_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await secureStorage.setItem(REFRESH_KEY, token);
  },

  async clearRefreshToken(): Promise<void> {
    await secureStorage.deleteItem(REFRESH_KEY);
  },

  // For logout later
  async clearAll(): Promise<void> {
    accessToken = null;
    await secureStorage.deleteItem(REFRESH_KEY);
  },
};
