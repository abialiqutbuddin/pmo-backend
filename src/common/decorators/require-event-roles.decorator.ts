// src/common/decorators/require-event-roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { EventRole } from '@prisma/client';

export const REQUIRE_EVENT_ROLES = 'REQUIRE_EVENT_ROLES';
export const RequireEventRoles = (...roles: EventRole[]) => SetMetadata(REQUIRE_EVENT_ROLES, roles);
