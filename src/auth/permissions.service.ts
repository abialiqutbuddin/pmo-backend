import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Check if a user has a specific permission.
     * Scoped to Event if eventId is provided (checking EventMembership role).
     * Otherwise checks global Tenant roles.
     */
    async hasPermission(userId: string, module: string, action: string, eventId?: string): Promise<boolean> {
        // 1. Check Super Admin (global override)
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true },
        });
        if (user?.isSuperAdmin) return true;

        // 2. Fetch all roles applicable
        const roleIds: string[] = [];

        // Global Tenant Roles
        const userRoles = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { roles: { select: { id: true } } },
        });
        if (userRoles?.roles) {
            roleIds.push(...userRoles.roles.map(r => r.id));
        }

        // Event Membership Role
        if (eventId) {
            console.log(`[PermissionsService] Checking eventId: ${eventId} for userId: ${userId}`);
            // We check all memberships for this event (user could be in multiple departments, but usually one role per membership?)
            // distinct roleIds
            const memberships = await this.prisma.eventMembership.findMany({
                where: { userId, eventId },
                select: { roleId: true },
                distinct: ['roleId'],
            });
            console.log(`[PermissionsService] Found memberships: ${JSON.stringify(memberships)}`);
            memberships.forEach(m => {
                if (m.roleId) roleIds.push(m.roleId);
            });
        } else {
            console.log(`[PermissionsService] No eventId provided for userId: ${userId}`);
        }

        console.log(`[PermissionsService] RoleIds: ${JSON.stringify(roleIds)}`);

        if (roleIds.length === 0) return false;

        if (roleIds.length === 0) return false;

        // 3. Check permissions on these roles
        // We look for a Permission entry for the given module containing the action
        const count = await this.prisma.permission.count({
            where: {
                roleId: { in: roleIds },
                module: { key: module }, // Module lookup by key
                // actions is Json. We need to check if array contains action.
                // Prisma doesn't strictly support array-contains on Json in all providers easily without Raw.
                // But for MySQL 'json_contains' equivalent:
                // path: $, target: "action"
                // simpler: fetch them and filter in app if volume low, OR use raw query.
                // For now, let's fetch to be safe and DB-agnostic-ish.
            },
        });

        if (count === 0) return false;

        // detailed check (since prisma count on Json is rough or simple existence)
        const permissions = await this.prisma.permission.findMany({
            where: {
                roleId: { in: roleIds },
                module: { key: module },
            },
            select: { actions: true },
        });

        return permissions.some(p => {
            if (Array.isArray(p.actions)) {
                return (p.actions as string[]).includes(action);
            }
            return false;
        });
    }
}
