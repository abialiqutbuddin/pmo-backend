// src/departments/departments.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDeptMemberDto } from './dto/add-dept-member.dto';
import { UpdateDeptMemberDto } from './dto/update-dept-member.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';
import { EventsService } from '../events/events.service';

@Injectable()
export class DepartmentsService {
    private readonly logger = new Logger(DepartmentsService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        private readonly eventsService: EventsService,
        @Inject(forwardRef(() => ChatGateway)) private readonly chatGateway: ChatGateway,
    ) { }

    private async assertAdmin(eventId: string, userId: string, isSuperAdmin: boolean) {
        if (isSuperAdmin) return;
        // Check for management permission or assume controller/guard handled it
    }

    private async assertMember(eventId: string, userId: string, isSuperAdmin: boolean, isTenantManager: boolean = false) {
        if (isSuperAdmin || isTenantManager) return;
        const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!m) throw new NotFoundException();
    }

    /* -------- Departments CRUD -------- */

    async list(eventId: string, viewer: { userId: string; isSuperAdmin: boolean; isTenantManager: boolean }) {
        const scope = await this.eventsService.getAccessibleScope(eventId, viewer.userId, viewer.isSuperAdmin, viewer.isTenantManager);

        const where: any = { eventId };

        if (!scope.all) {
            if (!scope.departmentIds.length) return [];
            where.id = { in: scope.departmentIds };
        }

        return this.prisma.department.findMany({
            where,
            select: { id: true, name: true, parentId: true },
            orderBy: { name: 'asc' },
        });
    }

    async create(eventId: string, dto: CreateDepartmentDto, actor: { userId: string; isSuperAdmin: boolean }) {
        if (dto.parentId) {
            const p = await this.prisma.department.findFirst({ where: { id: dto.parentId, eventId } });
            if (!p) throw new BadRequestException('Parent department not found in this event');
        }

        let tenantManagers: { id: string }[] = [];
        let deptChannelId: string | null = null;

        const result = await this.prisma.$transaction(async (tx) => {
            const dept = await tx.department.create({
                data: { eventId, name: dto.name, parentId: dto.parentId },
                select: { id: true, name: true, parentId: true },
            });

            // Get the event's tenant to find tenant managers
            const event = await tx.event.findUnique({
                where: { id: eventId },
                select: { tenantId: true },
            });

            // Find all tenant managers for this tenant
            tenantManagers = event?.tenantId
                ? await tx.user.findMany({
                    where: { tenantId: event.tenantId, isTenantManager: true },
                    select: { id: true },
                })
                : [];

            // Auto-create chat group for this department
            const deptChannel = await tx.conversation.create({
                data: {
                    eventId,
                    kind: 'DEPARTMENT',
                    title: `#${dto.name.toLowerCase().replace(/\s+/g, '-')}`,
                    departmentId: dept.id,
                    isSystemGroup: true,
                    isActive: true,
                },
                select: { id: true }
            });
            deptChannelId = deptChannel.id;

            // Add all tenant managers as participants
            if (tenantManagers.length > 0) {
                await Promise.all(
                    tenantManagers.map((tm) =>
                        tx.participant.create({
                            data: {
                                conversationId: deptChannel.id,
                                userId: tm.id,
                                role: 'MEMBER',
                            },
                        })
                    )
                );
            }

            return dept;
        });

        // Notify tenant managers and actor about the new department channel
        if (deptChannelId) {
            const freshConv = await this.prisma.conversation.findUnique({
                where: { id: deptChannelId },
                select: { id: true, eventId: true, kind: true, title: true, departmentId: true, isActive: true, isSystemGroup: true, updatedAt: true, participants: { select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true } } } } }
            });
            if (freshConv) {
                const notifyIds = new Set(tenantManagers.map(tm => tm.id));
                notifyIds.add(actor.userId);

                for (const uid of notifyIds) {
                    this.chatGateway.notifyConversationInvited(uid, freshConv);
                }
            }
        }

        return result;
    }

    async update(eventId: string, departmentId: string, dto: UpdateDepartmentDto, actor: { userId: string; isSuperAdmin: boolean }) {
        const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId } });
        if (!d) throw new NotFoundException();
        const updated = await this.prisma.department.update({
            where: { id: departmentId },
            data: { name: dto.name },
            select: { id: true, name: true },
        });

        // Update chat title if exists
        const deptChannel = await this.prisma.conversation.findFirst({ where: { departmentId, isSystemGroup: true } });
        if (deptChannel && dto.name) {
            const newTitle = `#${dto.name.toLowerCase().replace(/\s+/g, '-')}`;
            await this.prisma.conversation.update({ where: { id: deptChannel.id }, data: { title: newTitle } });
        }
        return updated;
    }

    async remove(eventId: string, departmentId: string, actor: { userId: string; isSuperAdmin: boolean }) {
        const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId } });
        if (!d) throw new NotFoundException();

        let deptChannelId: string | null = null;
        const deptChannel = await this.prisma.conversation.findFirst({
            where: { departmentId, isSystemGroup: true },
            select: { id: true }
        });
        if (deptChannel) deptChannelId = deptChannel.id;

        await this.prisma.$transaction(async (tx) => {
            await tx.eventMembership.deleteMany({ where: { eventId, departmentId } });
            await tx.conversation.updateMany({
                where: { departmentId, isSystemGroup: true },
                data: { isActive: false },
            });
            await tx.department.delete({ where: { id: departmentId } });
        });

        // Notify chat sync?
        if (deptChannelId) {
            // Technically if the channel is deactivated, we should probably update list or remove.
            this.chatGateway.notifyParticipantsUpdated(deptChannelId);
        }

        return { ok: true };
    }

    /* -------- Department Members -------- */

    async listMembers(eventId: string, departmentId: string, viewer: { userId: string; isSuperAdmin: boolean; isTenantManager: boolean }) {
        await this.assertMember(eventId, viewer.userId, viewer.isSuperAdmin, viewer.isTenantManager);
        return this.prisma.eventMembership.findMany({
            where: { eventId, departmentId },
            select: {
                id: true,
                userId: true,
                departmentId: true,
                createdAt: true,
                user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async addMember(eventId: string, departmentId: string, dto: AddDeptMemberDto, actor: { userId: string; isSuperAdmin: boolean }) {
        const dept = await this.prisma.department.findUnique({
            where: { id: departmentId },
            select: { name: true },
        });

        let deptChannelId: string | null = null;
        let generalChannelId: string | null = null;

        const membership = await this.prisma.$transaction(async (tx) => {
            const result = await tx.eventMembership.upsert({
                where: {
                    eventId_userId_departmentId: { eventId, userId: dto.userId, departmentId },
                },
                update: { departmentId },
                create: { eventId, userId: dto.userId, departmentId },
                select: { id: true, userId: true, departmentId: true },
            });

            const deptChannel = await tx.conversation.findFirst({
                where: { departmentId, isSystemGroup: true },
                select: { id: true },
            });

            if (deptChannel) {
                deptChannelId = deptChannel.id;
                await tx.participant.upsert({
                    where: { conversationId_userId: { conversationId: deptChannel.id, userId: dto.userId } },
                    update: {},
                    create: { conversationId: deptChannel.id, userId: dto.userId, role: 'MEMBER' },
                });
            }

            const generalChannel = await tx.conversation.findFirst({
                where: { eventId, kind: 'EVENT', isSystemGroup: true },
                select: { id: true },
            });

            if (generalChannel) {
                generalChannelId = generalChannel.id;
                await tx.participant.upsert({
                    where: { conversationId_userId: { conversationId: generalChannel.id, userId: dto.userId } },
                    update: {},
                    create: { conversationId: generalChannel.id, userId: dto.userId, role: 'MEMBER' },
                });
            }

            return result;
        });

        // Notify Chat Sync
        if (deptChannelId) {
            const c = await this.prisma.conversation.findUnique({
                where: { id: deptChannelId },
                select: { id: true, eventId: true, kind: true, title: true, departmentId: true, isActive: true, isSystemGroup: true, updatedAt: true, participants: { select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true } } } } }
            });
            if (c) {
                this.chatGateway.notifyConversationInvited(dto.userId, c);
                this.chatGateway.notifyParticipantsUpdated(deptChannelId);
            }
        }
        if (generalChannelId) {
            const c = await this.prisma.conversation.findUnique({
                where: { id: generalChannelId },
                select: { id: true, eventId: true, kind: true, title: true, departmentId: true, isActive: true, isSystemGroup: true, updatedAt: true, participants: { select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true } } } } }
            });
            if (c) {
                this.chatGateway.notifyConversationInvited(dto.userId, c);
                this.chatGateway.notifyParticipantsUpdated(generalChannelId);
            }
        }

        try {
            await this.notificationsService.create({
                userId: dto.userId,
                eventId,
                kind: 'DEPT_MEMBER_ADDED',
                title: 'Added to Department',
                body: `You have been added to the ${dept?.name || 'a department'} team`,
                link: `/tasks/departments`,
            });
        } catch (e: any) {
            this.logger.warn(`Notification (dept add) failed: ${e?.message || e}`);
        }

        return membership;
    }

    async updateMember(eventId: string, departmentId: string, userId: string, dto: UpdateDeptMemberDto, actor: { userId: string; isSuperAdmin: boolean }) {
        const mem = await this.prisma.eventMembership.findFirst({ where: { eventId, departmentId, userId } });
        if (!mem) throw new NotFoundException();
        return mem;
    }

    async removeMember(eventId: string, departmentId: string, userId: string, actor: { userId: string; isSuperAdmin: boolean }) {
        const dept = await this.prisma.department.findUnique({
            where: { id: departmentId },
            select: { name: true },
        });

        let deptChannelId: string | null = null;

        await this.prisma.$transaction(async (tx) => {
            await tx.eventMembership.deleteMany({ where: { eventId, departmentId, userId } });

            const deptChannel = await tx.conversation.findFirst({
                where: { departmentId, isSystemGroup: true },
                select: { id: true },
            });

            if (deptChannel) {
                deptChannelId = deptChannel.id;
                await tx.participant.deleteMany({
                    where: { conversationId: deptChannel.id, userId },
                });
            }
        });

        if (deptChannelId) {
            this.chatGateway.notifyKicked(deptChannelId, userId);
            this.chatGateway.notifyParticipantsUpdated(deptChannelId);
        }

        try {
            await this.notificationsService.create({
                userId,
                eventId,
                kind: 'DEPT_MEMBER_REMOVED',
                title: 'Removed from Department',
                body: `You have been removed from the ${dept?.name || 'a department'} team`,
            });
        } catch (e: any) {
            this.logger.warn(`Notification (dept remove) failed: ${e?.message || e}`);
        }

        return { ok: true };
    }

    async listAssignable(
        eventId: string,
        departmentId: string,
        viewer: { userId: string; isSuperAdmin: boolean; isTenantManager: boolean },
        q?: string,
    ) {
        await this.assertMember(eventId, viewer.userId, viewer.isSuperAdmin, viewer.isTenantManager);
        const memberships = await this.prisma.eventMembership.findMany({
            where: { eventId },
            select: {
                userId: true,
                departmentId: true,
                user: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const alreadyInDept = new Set(
            memberships.filter(m => m.departmentId === departmentId).map(m => m.userId)
        );

        const pool = memberships.filter(m => !alreadyInDept.has(m.userId));

        const byUser = new Map<string, { userId: string; fullName: string; email: string }>();
        for (const m of pool) {
            if (!byUser.has(m.userId)) {
                byUser.set(m.userId, { userId: m.user.id, fullName: m.user.fullName, email: m.user.email });
            }
        }

        let result = Array.from(byUser.values());
        if (q && q.trim()) {
            const term = q.trim().toLowerCase();
            result = result.filter(r =>
                (r.fullName || '').toLowerCase().includes(term) || (r.email || '').toLowerCase().includes(term)
            );
        }
        result.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        return result;
    }

    async bulkAddMembers(
        eventId: string,
        departmentId: string,
        items: { userId: string; role?: string }[],
        actor: { userId: string; isSuperAdmin: boolean },
    ) {
        if (!items.length) return { added: 0 };

        let deptChannelId: string | null = null;
        let generalChannelId: string | null = null;

        const deptChannel = await this.prisma.conversation.findFirst({ where: { departmentId, isSystemGroup: true }, select: { id: true } });
        const generalChannel = await this.prisma.conversation.findFirst({ where: { eventId, kind: 'EVENT', isSystemGroup: true }, select: { id: true } });
        if (deptChannel) deptChannelId = deptChannel.id;
        if (generalChannel) generalChannelId = generalChannel.id;

        await this.prisma.$transaction(
            items.map(i =>
                this.prisma.eventMembership.upsert({
                    where: { eventId_userId_departmentId: { eventId, userId: i.userId, departmentId } },
                    update: { departmentId },
                    create: { eventId, userId: i.userId, departmentId },
                }),
            ),
        );

        const userIds = items.map(i => i.userId);
        if (deptChannelId) {
            await this.prisma.participant.createMany({
                data: userIds.map(uid => ({ conversationId: deptChannelId!, userId: uid, role: 'MEMBER' })),
                skipDuplicates: true,
            });
        }
        if (generalChannelId) {
            await this.prisma.participant.createMany({
                data: userIds.map(uid => ({ conversationId: generalChannelId!, userId: uid, role: 'MEMBER' })),
                skipDuplicates: true,
            });
        }

        if (deptChannelId) {
            const c = await this.prisma.conversation.findUnique({
                where: { id: deptChannelId },
                select: { id: true, eventId: true, kind: true, title: true, departmentId: true, isActive: true, isSystemGroup: true, updatedAt: true, participants: { select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true } } } } }
            });
            if (c) {
                for (const uid of userIds) this.chatGateway.notifyConversationInvited(uid, c);
                this.chatGateway.notifyParticipantsUpdated(deptChannelId);
            }
        }
        if (generalChannelId) {
            const c = await this.prisma.conversation.findUnique({
                where: { id: generalChannelId },
                select: { id: true, eventId: true, kind: true, title: true, departmentId: true, isActive: true, isSystemGroup: true, updatedAt: true, participants: { select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true } } } } }
            });
            if (c) {
                for (const uid of userIds) this.chatGateway.notifyConversationInvited(uid, c);
                this.chatGateway.notifyParticipantsUpdated(generalChannelId);
            }
        }

        return { added: items.length };
    }
}
