import { httpClient } from '@/src/core/http/httpClient';
import type {
  AddShoppingListItemRequest,
  CreateShoppingListRequest,
  ShoppingList,
  ShoppingListListItem,
  UpdateShoppingListItemRequest,
  UpdateShoppingListRequest,
} from '@/src/features/shopping-lists/types';

export const shoppingListsApi = {
  list(status?: 'active' | 'archived'): Promise<ShoppingListListItem[]> {
    const query = status ? `?status=${status}` : '';
    return httpClient.appApi.get<ShoppingListListItem[]>(`/api/shopping-lists${query}`);
  },

  get(id: string): Promise<ShoppingList> {
    return httpClient.appApi.get<ShoppingList>(`/api/shopping-lists/${id}`);
  },

  create(
    body?: CreateShoppingListRequest,
    options?: { mode?: 'merge' | 'replace' },
  ): Promise<ShoppingList> {
    const mode = options?.mode ?? 'merge';
    const query = mode ? `?mode=${encodeURIComponent(mode)}` : '';
    return httpClient.appApi.post<ShoppingList>(`/api/shopping-lists${query}`, body ?? {});
  },

  patch(id: string, body: UpdateShoppingListRequest): Promise<ShoppingList> {
    return httpClient.appApi.patch<ShoppingList>(`/api/shopping-lists/${id}`, body);
  },

  addItem(listId: string, body: AddShoppingListItemRequest): Promise<ShoppingList> {
    return httpClient.appApi.post<ShoppingList>(`/api/shopping-lists/${listId}/items`, body);
  },

  updateItem(
    listId: string,
    itemId: string,
    body: UpdateShoppingListItemRequest,
  ): Promise<ShoppingList> {
    return httpClient.appApi.patch<ShoppingList>(
      `/api/shopping-lists/${listId}/items/${itemId}`,
      body,
    );
  },

  removeItem(listId: string, itemId: string): Promise<void> {
    return httpClient.appApi.delete<void>(`/api/shopping-lists/${listId}/items/${itemId}`);
  },

  remove(id: string): Promise<void> {
    return httpClient.appApi.delete<void>(`/api/shopping-lists/${id}`);
  },
};
