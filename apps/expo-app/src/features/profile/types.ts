export type Profile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  theme: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfileRequest = {
  displayName?: string;
  avatarUrl?: string | null;
  theme?: string;
};
