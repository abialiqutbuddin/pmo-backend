// src/common/guards/event.guard.ts
import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { sub: string } | undefined;
    if (!user) throw new UnauthorizedException();

    // Resolve eventId from route `:eventId` or header
    const eventId = req.params?.eventId || req.headers['x-event-id'];
    if (!eventId) throw new NotFoundException(); // no event context -> treat as not found

    const membership = await this.prisma.eventMembership.findFirst({
      where: { eventId: String(eventId), userId: user.sub },
    });

    if (!membership) {
      // do not leak event existence
      throw new NotFoundException();
    }

    req.eventId = String(eventId);
    req.eventMembership = membership; // cache for RoleGuard and handlers
    return true;
  }
}
