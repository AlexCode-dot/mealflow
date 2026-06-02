export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type RegisterResponse = {
  email: string;
  verificationRequired: boolean;
};
