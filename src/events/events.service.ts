// src/events/events.service.ts
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { ChatPermissionsHelper } from '../chat/chat-permissions.helper';

@Injectable()
export class EventsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => ChatPermissionsHelper)) private readonly chatPerms: ChatPermissionsHelper,
    ) { }

    /* ---------------- Events ---------------- */

    async create(dto: CreateEventDto, actor: { id: string; isSuperAdmin: boolean; tenantId: string }) {
        const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
        const endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;

        return this.prisma.$transaction(async (tx) => {
            const event = await tx.event.create({
                data: {
                    name: dto.name,
                    startsAt,
                    endsAt,
                    tenantId: actor.tenantId,
                    structure: dto.structure || 'ZONAL',
                },
                select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, structure: true },
            });

            // Creator membership
            await tx.eventMembership.create({
                data: { eventId: event.id, userId: actor.id },
            });

            // Grant creator admin permissions
            const eventsModule = await tx.module.findFirst({ where: { key: 'events' } });
            if (eventsModule) {
                // Check if valid actions in module features (optional safety)
                // But for now we blindly assign the known admin actions
                await tx.eventUserPermission.create({
                    data: {
                        eventId: event.id,
                        userId: actor.id,
                        moduleId: eventsModule.id,
                        actions: ['manage_settings', 'update', 'read', 'assign_members']
                    }
                });
            }

            // Find all tenant managers for this tenant
            const tenantManagers = await tx.user.findMany({
                where: { tenantId: actor.tenantId, isTenantManager: true },
                select: { id: true },
            });

            // Auto-create General channel for the event
            const generalChannel = await tx.conversation.create({
                data: {
                    eventId: event.id,
                    kind: 'EVENT',
                    title: 'General',
                    isSystemGroup: true,
                    isActive: true,
                },
            });

            // Add creator as participant of General channel
            await tx.participant.create({
                data: {
                    conversationId: generalChannel.id,
                    userId: actor.id,
                    role: 'OWNER',
                },
            });

            // Add all tenant managers as participants of General channel
            for (const tm of tenantManagers) {
                if (tm.id !== actor.id) {
                    await tx.participant.upsert({
                        where: {
                            conversationId_userId: {
                                conversationId: generalChannel.id,
                                userId: tm.id,
                            },
                        },
                        update: {},
                        create: {
                            conversationId: generalChannel.id,
                            userId: tm.id,
                            role: 'MEMBER',
                        },
                    });
                    // Also create event membership for tenant managers
                    // Also create event membership for tenant managers
                    const existingMb = await tx.eventMembership.findFirst({
                        where: {
                            eventId: event.id,
                            userId: tm.id,
                            departmentId: null,
                        },
                    });
                    if (!existingMb) {
                        await tx.eventMembership.create({
                            data: { eventId: event.id, userId: tm.id },
                        });
                    }
                }
            }

            if (dto.departments?.length) {
                const createdDepts = await Promise.all(
                    dto.departments.map(async (d) => {
                        const dept = await tx.department.create({
                            data: { eventId: event.id, name: d.name },
                            select: { id: true, name: true },
                        });

                        // Auto-create chat group for this department
                        const deptChannel = await tx.conversation.create({
                            data: {
                                eventId: event.id,
                                kind: 'DEPARTMENT',
                                title: `#${d.name.toLowerCase().replace(/\s+/g, '-')}`,
                                departmentId: dept.id,
                                isSystemGroup: true,
                                isActive: true,
                            },
                        });

                        // Add all tenant managers as participants of this department channel
                        for (const tm of tenantManagers) {
                            await tx.participant.upsert({
                                where: {
                                    conversationId_userId: {
                                        conversationId: deptChannel.id,
                                        userId: tm.id,
                                    },
                                },
                                update: {},
                                create: {
                                    conversationId: deptChannel.id,
                                    userId: tm.id,
                                    role: 'MEMBER',
                                },
                            });
                        }

                        return { ...dept, channelId: deptChannel.id };
                    }),
                );

                const nameToData = new Map(createdDepts.map((d) => [d.name, { id: d.id, channelId: d.channelId }]));

                for (const d of dto.departments) {
                    if (!d.members?.length) continue;
                    const deptData = nameToData.get(d.name)!;

                    for (const m of d.members) {
                        // Logic for dept scoping/assignment remains, but NO role enum check.
                        // Assuming validation happens elsewhere or basic membership.

                        await tx.eventMembership.upsert({
                            where: {
                                eventId_userId_departmentId: {
                                    eventId: event.id,
                                    userId: m.userId,
                                    departmentId: deptData.id,
                                } as any,
                            },
                            update: { departmentId: deptData.id },
                            create: {
                                eventId: event.id,
                                userId: m.userId,
                                departmentId: deptData.id,
                            },
                        });

                        // Add member to department's chat group
                        await tx.participant.upsert({
                            where: {
                                conversationId_userId: {
                                    conversationId: deptData.channelId,
                                    userId: m.userId,
                                },
                            },
                            update: {},
                            create: {
                                conversationId: deptData.channelId,
                                userId: m.userId,
                                role: 'MEMBER',
                            },
                        });

                        // Add member to General channel too
                        await tx.participant.upsert({
                            where: {
                                conversationId_userId: {
                                    conversationId: generalChannel.id,
                                    userId: m.userId,
                                },
                            },
                            update: {},
                            create: {
                                conversationId: generalChannel.id,
                                userId: m.userId,
                                role: 'MEMBER',
                            },
                        });
                    }
                }
            }

            return event;
        });
    }

    async get(eventId: string, viewer: { userId: string; isSuperAdmin: boolean }) {
        if (!viewer.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: viewer.userId } });
            if (!m) throw new NotFoundException();
        }
        const e = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true, zonesEnabled: true, structure: true },
        });
        if (!e) throw new NotFoundException();
        return e;
    }

    async listForUser(viewer: { userId: string; isSuperAdmin: boolean }) {
        if (viewer.isSuperAdmin) {
            return this.prisma.event.findMany({
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true, zonesEnabled: true, structure: true },
            });
        }
        const memberships = await this.prisma.eventMembership.findMany({
            where: { userId: viewer.userId },
            select: { eventId: true },
        });
        const ids = memberships.map((m) => m.eventId);
        if (!ids.length) return [];
        return this.prisma.event.findMany({
            where: { id: { in: ids } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true, zonesEnabled: true, structure: true },
        });
    }

    async update(eventId: string, dto: UpdateEventDto, actor: { userId: string; isSuperAdmin: boolean }) {
        // Access control moved to Guards. Service just executes.
        return this.prisma.event.update({
            where: { id: eventId },
            data: {
                name: dto.name,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
                endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
                archivedAt: dto.archivedAt ? new Date(dto.archivedAt) : undefined,
                structure: dto.structure,
                zonesEnabled: dto.zonesEnabled,
            },
            select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true, structure: true, zonesEnabled: true },
        });
    }

    async remove(eventId: string, actor: { userId: string; isSuperAdmin: boolean }) {
        // Access control moved to Guards.
        await this.prisma.$transaction(async (tx) => {
            await tx.eventMembership.deleteMany({ where: { eventId } });
            await tx.department.deleteMany({ where: { eventId } });
            await tx.event.delete({ where: { id: eventId } });
        });
        return { ok: true };
    }

    /* ---------------- Memberships ---------------- */

    async addMember(eventId: string, dto: AddMemberDto, actor: { userId: string; isSuperAdmin: boolean }) {
        // Access control moved to Guards. 
        // We accept that whoever calls this is authorized.

        const result = await this.prisma.eventMembership.upsert({
            where: {
                eventId_userId_departmentId: {
                    eventId, userId: dto.userId, departmentId: (dto.departmentId ?? undefined) as string,
                }
            },
            update: { departmentId: dto.departmentId ?? null, roleId: dto.roleId ?? null },
            create: { eventId, userId: dto.userId, departmentId: dto.departmentId ?? null, roleId: dto.roleId ?? null },
            select: { id: true, userId: true, departmentId: true, eventId: true, roleId: true },
        });

        // If a role was assigned, check if it has global chat:read and sync participants
        if (dto.roleId) {
            await this.syncChatParticipantsForUser(eventId, dto.userId, dto.roleId);
        }

        return result;
    }

    async updateMember(eventId: string, userId: string, dto: UpdateMemberDto, actor: { userId: string; isSuperAdmin: boolean }) {
        const mem = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!mem) throw new NotFoundException();

        const data: any = {};
        if (dto.roleId !== undefined) data.roleId = dto.roleId;
        // Only update departmentId if explicitly provided (which frontend won't anymore, but for safety)
        if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;

        const result = await this.prisma.eventMembership.update({
            where: { id: mem.id },
            data,
            select: { id: true, userId: true, departmentId: true, eventId: true, roleId: true },
        });

        // If role was changed, sync chat participants
        if (dto.roleId !== undefined) {
            if (dto.roleId) {
                await this.syncChatParticipantsForUser(eventId, userId, dto.roleId);
            } else {
                // Role removed - check if user should be removed from system groups
                await this.chatPerms.removeUserFromNonDepartmentSystemGroups(eventId, userId);
            }
        }

        return result;
    }

    async removeMember(eventId: string, userId: string, actor: { userId: string; isSuperAdmin: boolean }, departmentId?: string) {
        if (departmentId) {
            // Remove specific assignment
            await this.prisma.eventMembership.deleteMany({
                where: { eventId, userId, departmentId }
            });
        } else {
            // Remove all assignments (remove user from event entirely)
            await this.prisma.eventMembership.deleteMany({ where: { eventId, userId } });
        }
        return { ok: true };
    }

    async listMembers(eventId: string, viewer: { userId: string; isSuperAdmin: boolean; isTenantManager?: boolean }) {
        if (!viewer.isSuperAdmin && !viewer.isTenantManager) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: viewer.userId } });
            if (!m) throw new NotFoundException();
        }
        const rows = await this.prisma.eventMembership.findMany({
            where: { eventId },
            select: {
                userId: true,
                departmentId: true,
                roleId: true,
                department: { select: { id: true, name: true } },
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            select: {
                                actions: true,
                                module: { select: { key: true } }
                            }
                        }
                    }
                },
                user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true, designation: true } },
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return rows;
    }

    async listUserMemberships(eventId: string, userId: string) {
        return this.prisma.eventMembership.findMany({
            where: { eventId, userId },
            select: {
                userId: true,
                departmentId: true,
                roleId: true,
                department: { select: { id: true, name: true } },
                role: {
                    select: {
                        id: true,
                        name: true,
                        permissions: {
                            select: {
                                actions: true,
                                module: { select: { key: true } }
                            }
                        }
                    }
                },
                createdAt: true,
            },
        });
    }

    async bulkAddMembers(eventId: string, userIds: string[], roleId: string | undefined, actor: { userId: string; isSuperAdmin: boolean }) {
        if (!userIds || !userIds.length) return { added: 0 };

        let count = 0;
        // Use a transaction to ensure atomicity for the batch, but manual check-and-create
        await this.prisma.$transaction(async (tx) => {
            for (const userId of userIds) {
                // Check assuming tenant scoping logic is handled by caller (listing assignable users)
                const exists = await tx.eventMembership.findFirst({
                    where: { eventId, userId, departmentId: null }
                });
                if (!exists) {
                    await tx.eventMembership.create({
                        data: { eventId, userId, departmentId: null, roleId: roleId ?? null }
                    });
                    count++;
                }
            }
        });
        return { added: count };
    }

    async listAssignableUsers(eventId: string, tenantId: string) {
        // 1. Get all event members
        const members = await this.prisma.eventMembership.findMany({
            where: { eventId },
            select: { userId: true }
        });
        const memberIds = new Set(members.map(m => m.userId));

        // 2. Get all tenant users strictly excluding those ids
        const users = await this.prisma.user.findMany({
            where: {
                tenantId,
                isDisabled: false,
                id: { notIn: Array.from(memberIds) }
            },
            select: { id: true, fullName: true, email: true, itsId: true, profileImage: true, designation: true },
            orderBy: { fullName: 'asc' }
        });
        return users;
    }
    async getAccessibleScope(eventId: string, userId: string, isSuperAdmin: boolean, isTenantManager: boolean = false): Promise<{ all: boolean, departmentIds: string[] }> {
        if (isSuperAdmin || isTenantManager) return { all: true, departmentIds: [] };

        // 1. Get all memberships for this user in this event
        const memberships = await this.prisma.eventMembership.findMany({
            where: { eventId, userId },
            include: { role: { include: { permissions: { include: { module: true } } } } }
        });

        if (!memberships.length) return { all: false, departmentIds: [] };

        // 2. Check for Global Access
        let hasGlobalView = false;
        const explicitDeptIds: string[] = [];

        for (const m of memberships) {
            // Check permissions
            const perms = m.role?.permissions.flatMap(p => {
                const actions = (p.actions as unknown as string[]) || [];
                return actions.map(a => `${p.module.key}:${a}`);
            }) || [];
            const isAdmin = m.role?.name === 'OWNER' || m.role?.name === 'PMO_ADMIN' || perms.includes('events:manage_settings');

            if (!m.departmentId) {
                // Global Assignment
                // If they have a global role, we essentially grant global read for now, 
                // OR we can check specific 'tasks:read' global permission.
                if (isAdmin || perms.includes('tasks:read') || perms.includes('tasks:view_all')) {
                    hasGlobalView = true;
                }
            } else {
                // Department Assignment
                explicitDeptIds.push(m.departmentId);
            }
        }

        if (hasGlobalView) return { all: true, departmentIds: [] };
        if (!explicitDeptIds.length) return { all: false, departmentIds: [] };

        // 3. Expand Hierarchy (Parents + Children)
        // Fetch all departments for this event to build graph
        const allDepts = await this.prisma.department.findMany({
            where: { eventId },
            select: { id: true, parentId: true }
        });

        const allowed = new Set<string>();

        // Build adjacency for traversal
        const parentMap = new Map<string, string | null>();
        const childrenMap = new Map<string, string[]>();

        for (const d of allDepts) {
            parentMap.set(d.id, d.parentId);
            if (d.parentId) {
                const list = childrenMap.get(d.parentId) || [];
                list.push(d.id);
                childrenMap.set(d.parentId, list);
            }
        }

        // For each explicit dept, walk up and down
        for (const startId of explicitDeptIds) {
            allowed.add(startId);

            // Walk Down (Children - recursive)
            const queue = [startId];
            while (queue.length) {
                const cid = queue.shift()!;
                const kids = childrenMap.get(cid) || [];
                for (const k of kids) {
                    if (!allowed.has(k)) {
                        allowed.add(k);
                        queue.push(k);
                    }
                }
            }
        }

        return { all: false, departmentIds: Array.from(allowed) };
    }

    /**
     * Check if a role has global chat:read permission and sync the user to system groups.
     */
    private async syncChatParticipantsForUser(eventId: string, userId: string, roleId: string) {
        // Find the role and its permissions
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
            include: {
                permissions: {
                    include: { module: true },
                },
            },
        });

        if (!role) return;

        // Check if role has global scope (EVENT or BOTH) and chat:read permission
        const isGlobalScope = role.scope === 'EVENT' || role.scope === 'BOTH';
        if (!isGlobalScope) return;

        const chatPerm = role.permissions.find(p => p.module?.key === 'chat');
        if (!chatPerm) return;

        const actions = (chatPerm.actions as string[]) || [];
        if (actions.includes('read')) {
            // User has global chat:read - add to all system groups
            await this.chatPerms.addUserToAllSystemGroups(eventId, userId);
        }
    }
}
