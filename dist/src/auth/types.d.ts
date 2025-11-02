export type AccessJwtClaims = Record<string, unknown> & {
    sub: string;
    email: string;
    isSuperAdmin: boolean;
    iat?: number;
    exp?: number;
};
export type AccessToken = {
    accessToken: string;
};
export type TokenPair = {
    accessToken: string;
    refreshToken: string;
};
