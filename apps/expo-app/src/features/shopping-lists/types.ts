export type ShoppingListItem = {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  checked: boolean;
};

export type ShoppingList = {
  id: string;
  status: 'active' | 'archived';
  weeklyPlanId?: string | null;
  title?: string | null;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListListItem = {
  id: string;
  status: 'active' | 'archived';
  weeklyPlanId?: string | null;
  title?: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateShoppingListRequest = {
  weeklyPlanId?: string;
  title?: string;
};

export type UpdateShoppingListRequest = {
  status?: 'active' | 'archived';
  title?: string;
};

export type AddShoppingListItemRequest = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

export type UpdateShoppingListItemRequest = {
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  checked?: boolean;
};
