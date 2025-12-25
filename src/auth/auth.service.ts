// src/auth/auth.service.ts
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { add } from 'date-fns';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { User } from '@prisma/client';
import { AccessJwtClaims, TokenPair } from './types';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Convert compact TTL strings to seconds for jwt.sign (number avoids type conflicts)
 * Supports: "900s", "15m", "12h", "30d"
 */
function ttlToSeconds(ttl = '900s'): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 900;
  const n = parseInt(m[1], 10);
  const u = m[2];
  return u === 's' ? n : u === 'm' ? n * 60 : u === 'h' ? n * 3600 : n * 86400;
}

const ACCESS_TTL_SEC = ttlToSeconds(process.env.ACCESS_TOKEN_TTL ?? '1d');
const REFRESH_TTL_SEC = ttlToSeconds(process.env.REFRESH_TOKEN_TTL ?? '30d');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) { }

  /* ---------- Public API ---------- */

  async login(dto: LoginDto, tenantId: string, ua?: string, ip?: string): Promise<TokenPair> {
    const user = await this.validateUser(dto.email, dto.password, tenantId);

    const accessToken = await this.signAccessToken(user);

    // Prepare refresh token (token string + hash + expiry)
    const { token: refreshToken, tokenHash, expiresAt } = await this.signRefreshToken(user);

    // Persist session row for this device
    await this.prisma.sessionToken.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: ua,
        ip,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async lookupTenants(email: string): Promise<{ id: string; name: string; slug: string }[]> {
    const users = await this.prisma.user.findMany({
      where: { email, isDisabled: false },
      include: { tenant: true },
    });
    return users.map((u) => ({
      id: u.tenant.id,
      name: u.tenant.name,
      slug: u.tenant.slug,
    }));
  }

  async refresh(dto: RefreshDto, ua?: string, ip?: string): Promise<TokenPair> {
    // Verify the JWT signature/exp for the raw refresh token
    let decoded: any;
    try {
      decoded = await this.jwt.verifyAsync(dto.refreshToken, {
        secret: requiredEnv('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId: string | undefined = decoded?.sub;
    if (!userId) throw new UnauthorizedException('Invalid refresh token');

    // Find the matching, active session for this user
    const sessions = await this.prisma.sessionToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'desc' },
      take: 25, // small cap for performance; adjust if needed
    });

    // Match against stored hashes (supports multiple devices)
    const matching = await this.findMatchingSession(dto.refreshToken, sessions);
    if (!matching) throw new UnauthorizedException('Refresh session not found');

    // Ensure user still valid
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDisabled) throw new ForbiddenException('User disabled');

    // Rotate: revoke old session + create a new one atomically
    const accessToken = await this.signAccessToken(user);
    const { token: newRefreshToken, tokenHash: newTokenHash, expiresAt } = await this.signRefreshToken(user);

    await this.prisma.$transaction([
      this.prisma.sessionToken.update({
        where: { id: matching.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.sessionToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          userAgent: ua,
          ip,
          expiresAt,
        },
      }),
    ]);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logout:
   * - If `all` is true: revoke every active session for the user.
   * - Else, revoke just the session that matches the provided refresh token.
   */
  async logout(userId: string, refreshToken?: string, all?: boolean): Promise<void> {
    if (!userId) return;

    if (all) {
      await this.prisma.sessionToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }

    if (!refreshToken) return;

    const sessions = await this.prisma.sessionToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'desc' },
      take: 25,
    });

    const matching = await this.findMatchingSession(refreshToken, sessions);
    if (matching) {
      await this.prisma.sessionToken.update({
        where: { id: matching.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  /* ---------- Internals ---------- */

  private async validateUser(email: string, password: string, tenantId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        email_tenantId: {
          email,
          tenantId,
        },
      },
    });
    if (!user || user.isDisabled) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: AccessJwtClaims = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: !!user.isSuperAdmin,
      isTenantManager: !!user.isTenantManager,
      tenantId: user.tenantId, // Include tenantId
    };

    // Pass a plain object payload and a numeric expiresIn (seconds)
    return this.jwt.signAsync(payload as Record<string, unknown>, {
      secret: requiredEnv('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TTL_SEC,
      algorithm: 'HS256',
    });
  }

  private async signRefreshToken(user: User): Promise<{ token: string; tokenHash: string; expiresAt: Date }> {
    // Keep refresh claims minimal
    const payload: { sub: string; typ: 'refresh' } = { sub: user.id, typ: 'refresh' };

    const token = await this.jwt.signAsync(payload as Record<string, unknown>, {
      secret: requiredEnv('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TTL_SEC,
      algorithm: 'HS256',
    });

    const tokenHash = await argon2.hash(token);
    const expiresAt = this.computeExpiryFromSeconds(REFRESH_TTL_SEC);
    return { token, tokenHash, expiresAt };
  }

  private computeExpiryFromSeconds(seconds: number): Date {
    return add(new Date(), { seconds });
  }

  private async findMatchingSession(
    rawRefreshToken: string,
    sessions: { id: string; tokenHash: string }[],
  ): Promise<{ id: string } | null> {
    for (const s of sessions) {
      const match = await argon2.verify(s.tokenHash, rawRefreshToken).catch(() => false);
      if (match) return { id: s.id };
    }
    return null;
  }
}
