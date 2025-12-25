import { SetMetadata, Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../auth/permissions.service';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
    module: string;
    action: string;
}

export const RequirePermission = (module: string, action: string) =>
    SetMetadata(PERMISSIONS_KEY, { module, action });

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionsService: PermissionsService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!required) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.sub) {
            // If JwtAuthGuard didn't run or fail, we might not have user.
            // But usually this guard runs after AuthGuard.
            // If public, maybe return false or throw.
            throw new UnauthorizedException('User not found');
        }

        // Check if eventId is in params (for event-scoped checks)
        const eventId = request.params?.eventId;
        console.log(`[PermissionsGuard] URL: ${request.url}, Params: ${JSON.stringify(request.params)}, extracted eventId: ${eventId}`);

        const hasAccess = await this.permissionsService.hasPermission(user.sub, required.module, required.action, eventId);

        if (!hasAccess) {
            throw new ForbiddenException(`Missing permission: ${required.action} on ${required.module}. Debug: EventID=${eventId}, UserID=${user.sub}`);
        }

        return true;
    }
}
