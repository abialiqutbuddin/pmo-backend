// src/auth/types.ts
export type AccessJwtClaims = Record<string, unknown> & {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  isTenantManager: boolean;
  tenantId: string;
  iat?: number;
  exp?: number;
};

export type AccessToken = { accessToken: string };
export type TokenPair = { accessToken: string; refreshToken: string };
