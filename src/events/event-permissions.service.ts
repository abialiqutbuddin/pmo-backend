import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Manages event-scoped permissions.
 * These apply to actions WITHIN an event (tasks, chat, departments, etc.)
 * Tenant-level permissions (events, roles, users) are handled by RbacService.
 */
@Injectable()
export class EventPermissionsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get all permissions for a specific user within a specific event.
     */
    async getUserEventPermissions(eventId: string, userId: string) {
        // 1. Direct Permissions
        const directPermissions = await this.prisma.eventUserPermission.findMany({
            where: { eventId, userId },
            include: { module: true },
        });

        // 2. Role Permissions (via Memberships)
        const memberships = await this.prisma.eventMembership.findMany({
            where: { eventId, userId },
            include: {
                role: {
                    include: {
                        permissions: { include: { module: true } }
                    }
                }
            }
        });

        const permissionMap: Record<string, string[]> = {};

        const addActions = (moduleKey: string, actions: string[]) => {
            if (!permissionMap[moduleKey]) permissionMap[moduleKey] = [];
            const set = new Set([...permissionMap[moduleKey], ...actions]);
            permissionMap[moduleKey] = Array.from(set);
        };

        // A. Add Role Permissions
        for (const mem of memberships) {
            if (mem.role?.permissions) {
                for (const perm of mem.role.permissions) {
                    addActions(perm.module.key, perm.actions as string[]);
                }
            }
        }

        // B. Add Direct Permissions
        for (const p of directPermissions) {
            addActions(p.module.key, p.actions as string[]);
        }

        return permissionMap;
    }

    /**
     * Get flattened permissions array for a user in an event (e.g., ["tasks:read", "tasks:create"])
     */
    async getFlattenedPermissions(eventId: string, userId: string): Promise<string[]> {
        const permissionMap = await this.getUserEventPermissions(eventId, userId);
        const flat: string[] = [];

        for (const [moduleKey, actions] of Object.entries(permissionMap)) {
            for (const action of actions) {
                flat.push(`${moduleKey}:${action}`);
            }
        }
        return flat;
    }

    /**
     * Set permissions for a user in an event for a specific module.
     * Upserts - if permission exists, updates; otherwise creates.
     */
    async setUserModulePermission(
        eventId: string,
        userId: string,
        moduleId: string,
        actions: string[],
    ) {
        // Validate event exists
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event) throw new NotFoundException('Event not found');

        // Validate user exists and belongs to tenant
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.tenantId !== event.tenantId) {
            throw new NotFoundException('User not found or does not belong to this tenant');
        }

        // Validate module exists
        const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
        if (!module) throw new NotFoundException('Module not found');

        // Validate actions are valid for this module
        const validFeatures = (module.features as string[]) || [];
        const invalid = actions.filter(a => !validFeatures.includes(a));
        if (invalid.length > 0) {
            throw new BadRequestException(`Invalid actions for module ${module.name}: ${invalid.join(', ')}`);
        }

        // If actions is empty, delete the permission
        if (actions.length === 0) {
            await this.prisma.eventUserPermission.deleteMany({
                where: { eventId, userId, moduleId },
            });
            return { deleted: true };
        }

        // Upsert permission
        return this.prisma.eventUserPermission.upsert({
            where: {
                eventId_userId_moduleId: { eventId, userId, moduleId },
            },
            update: { actions },
            create: { eventId, userId, moduleId, actions },
            include: { module: true },
        });
    }

    /**
     * Bulk set all permissions for a user in an event.
     * Expects: { moduleId: actions[] }
     */
    async setAllUserPermissions(
        eventId: string,
        userId: string,
        permissions: Record<string, string[]>,
    ) {
        // Validate event and user
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event) throw new NotFoundException('Event not found');

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.tenantId !== event.tenantId) {
            throw new NotFoundException('User not found or does not belong to this tenant');
        }

        // Delete existing permissions and recreate
        await this.prisma.$transaction(async (tx) => {
            await tx.eventUserPermission.deleteMany({ where: { eventId, userId } });

            for (const [moduleId, actions] of Object.entries(permissions)) {
                if (actions.length === 0) continue;

                const module = await tx.module.findUnique({ where: { id: moduleId } });
                if (!module) {
                    throw new NotFoundException(`Module ${moduleId} not found`);
                }

                await tx.eventUserPermission.create({
                    data: { eventId, userId, moduleId, actions },
                });
            }
        });

        return this.getUserEventPermissions(eventId, userId);
    }

    /**
     * List all users with permissions in an event (for Admin UI).
     */
    async listEventPermissions(eventId: string) {
        // Get all unique users with permissions in this event
        const permissions = await this.prisma.eventUserPermission.findMany({
            where: { eventId },
            include: {
                user: { select: { id: true, fullName: true, email: true } },
                module: true,
            },
        });

        // Group by user
        const userPermissions: Record<string, {
            user: { id: string; fullName: string; email: string };
            permissions: Record<string, string[]>;
        }> = {};

        for (const p of permissions) {
            if (!userPermissions[p.userId]) {
                userPermissions[p.userId] = {
                    user: p.user,
                    permissions: {},
                };
            }
            userPermissions[p.userId].permissions[p.module.key] = p.actions as string[];
        }

        return Object.values(userPermissions);
    }

    /**
     * Copy permissions from one user to another within the same event.
     */
    async copyUserPermissions(eventId: string, fromUserId: string, toUserId: string) {
        const sourcePermissions = await this.prisma.eventUserPermission.findMany({
            where: { eventId, userId: fromUserId },
        });

        if (sourcePermissions.length === 0) {
            throw new BadRequestException('Source user has no permissions to copy');
        }

        // Delete target user's existing permissions
        await this.prisma.eventUserPermission.deleteMany({
            where: { eventId, userId: toUserId },
        });

        // Create new permissions for target user
        await this.prisma.eventUserPermission.createMany({
            data: sourcePermissions.map(p => ({
                eventId,
                userId: toUserId,
                moduleId: p.moduleId,
                actions: p.actions as string[],
            })),
        });

        return this.getUserEventPermissions(eventId, toUserId);
    }
}
