import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ChatPermissions {
    canViewAllSystemGroups: boolean;  // chat:read with global scope
    canSendToSystemGroups: boolean;   // chat:send_message with global scope
    canDeleteMessages: boolean;       // chat:delete_message with global scope
}

@Injectable()
export class ChatPermissionsHelper {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get chat permissions for a user in an event based on their roles.
     * Only considers roles with EVENT (global) scope.
     */
    async getUserChatPermissions(eventId: string, userId: string): Promise<ChatPermissions> {
        // Find user's memberships with roles that have global scope
        const memberships = await this.prisma.eventMembership.findMany({
            where: { eventId, userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                module: true,
                            },
                        },
                    },
                },
            },
        });

        let canViewAllSystemGroups = false;
        let canSendToSystemGroups = false;
        let canDeleteMessages = false;

        for (const membership of memberships) {
            const role = membership.role;
            if (!role) continue;

            // Only consider global-scoped roles (EVENT or BOTH)
            if (role.scope !== 'EVENT' && role.scope !== 'BOTH') continue;

            // Check chat module permissions
            for (const perm of role.permissions) {
                if (perm.module.key !== 'chat') continue;

                const actions = (perm.actions as string[]) || [];
                if (actions.includes('read')) canViewAllSystemGroups = true;
                if (actions.includes('send_message')) canSendToSystemGroups = true;
                if (actions.includes('delete_message')) canDeleteMessages = true;
            }
        }

        return {
            canViewAllSystemGroups,
            canSendToSystemGroups,
            canDeleteMessages,
        };
    }

    /**
     * Check if user should be auto-added to system groups based on their roles.
     * Returns true if user has any role with global chat:read permission.
     */
    async shouldAutoAddToSystemGroups(eventId: string, userId: string): Promise<boolean> {
        const perms = await this.getUserChatPermissions(eventId, userId);
        return perms.canViewAllSystemGroups;
    }

    /**
     * Auto-add user to all system groups in an event.
     * Used when a user gets a role with global chat:read permission.
     */
    async addUserToAllSystemGroups(eventId: string, userId: string): Promise<void> {
        const systemGroups = await this.prisma.conversation.findMany({
            where: { eventId, isSystemGroup: true },
            select: { id: true },
        });

        for (const sg of systemGroups) {
            await this.prisma.participant.upsert({
                where: {
                    conversationId_userId: {
                        conversationId: sg.id,
                        userId,
                    },
                },
                update: {},
                create: {
                    conversationId: sg.id,
                    userId,
                    role: 'MEMBER',
                },
            });
        }
    }

    /**
     * Remove user from system groups they don't belong to via department membership.
     * Used when a user's role with global chat:read permission is revoked.
     */
    async removeUserFromNonDepartmentSystemGroups(eventId: string, userId: string): Promise<void> {
        // First check if they still have any role with global chat access
        const perms = await this.getUserChatPermissions(eventId, userId);
        if (perms.canViewAllSystemGroups) {
            return; // Still has access via another role
        }

        // Get user's department memberships
        const deptMemberships = await this.prisma.eventMembership.findMany({
            where: { eventId, userId, departmentId: { not: null } },
            select: { departmentId: true },
        });
        const deptIds = deptMemberships.map((m) => m.departmentId).filter(Boolean) as string[];

        // Find system groups to remove from (excluding their department channels and General)
        const systemGroupsToRemove = await this.prisma.conversation.findMany({
            where: {
                eventId,
                isSystemGroup: true,
                kind: 'DEPARTMENT', // Only remove from dept channels they don't belong to
                NOT: {
                    departmentId: { in: deptIds },
                },
            },
            select: { id: true },
        });

        for (const sg of systemGroupsToRemove) {
            await this.prisma.participant.deleteMany({
                where: {
                    conversationId: sg.id,
                    userId,
                },
            });
        }
    }
}
