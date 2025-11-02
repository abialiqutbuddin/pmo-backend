import { EventRole } from '@prisma/client';
export declare const REQUIRE_EVENT_ROLES = "REQUIRE_EVENT_ROLES";
export declare const RequireEventRoles: (...roles: EventRole[]) => import("@nestjs/common").CustomDecorator<string>;
