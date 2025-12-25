// src/auth/strategies/jwt-access.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { AccessJwtClaims } from '../types';
import { PrismaService } from '../../prisma/prisma.service';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: requiredEnv('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
    };
    super(opts);
  }

  async validate(payload: AccessJwtClaims) {
    // Hydrate permissions
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            permissions: {
              include: { module: true },
            },
          },
        },
      },
    });

    if (!user || user.isDisabled) { // Optional: re-check disabled status
      return null; // or throw Unauthorized
    }

    // Return full user object which acts as the 'user' property in Request
    return { ...user, sub: user.id };
  }
}
