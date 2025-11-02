// src/common/decorators/current-membership.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { EventMembership } from '@prisma/client';

export const CurrentMembership = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.eventMembership as EventMembership | undefined;
});
