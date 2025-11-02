// src/common/guards/role.guard.ts
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_EVENT_ROLES } from '../decorators/require-event-roles.decorator';
import { EventRole } from '@prisma/client';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const roles = this.reflector.getAllAndOverride<EventRole[]>(REQUIRE_EVENT_ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!roles || roles.length === 0) return true;

    const user = req.user as { isSuperAdmin: boolean } | undefined;
    if (user?.isSuperAdmin) return true;

    const membership = req.eventMembership as { role: EventRole } | undefined;
    if (!membership) throw new ForbiddenException();

    if (!roles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
