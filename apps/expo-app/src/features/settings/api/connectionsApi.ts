import { authed } from '@/src/features/settings/api/integrationTokensApi';

export type ConnectionScope =
  | 'recipes.read'
  | 'recipes.write'
  | 'mealplan.read'
  | 'mealplan.write'
  | 'shoppinglist.read'
  | 'shoppinglist.write';

/** An app (e.g. Personal OS) the user connected to MealFlow via OAuth. */
export type Connection = {
  clientId: string;
  name: string;
  scopes: ConnectionScope[];
  connectedAt: string;
  lastActiveAt: string | null;
};

export const connectionsApi = {
  list(): Promise<Connection[]> {
    return authed<Connection[]>('/account/connections', 'GET');
  },

  revoke(clientId: string): Promise<void> {
    return authed<void>(`/account/connections/${encodeURIComponent(clientId)}`, 'DELETE');
  },
};
