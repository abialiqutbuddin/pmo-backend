// src/events/events.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class EventsService {
    constructor(private readonly prisma: PrismaService) { }

    // ✅ define role sets once (strongly typed)
    private static readonly ADMIN_ROLES = new Set<EventRole>([
        EventRole.OWNER,
        EventRole.PMO_ADMIN,
    ]);


    private static readonly DEPT_SCOPED = new Set<EventRole>([
        EventRole.DEPT_HEAD,
        EventRole.DEPT_MEMBER,
        EventRole.OBSERVER,
    ]);
    private static readonly EVENT_SCOPED = new Set<EventRole>([
        EventRole.OWNER,
        EventRole.PMO_ADMIN,
        EventRole.PMO_POC,
        EventRole.GUEST,
    ]);

    /* ---------------- Events ---------------- */

    async create(dto: CreateEventDto, actor: { id: string; isSuperAdmin: boolean }) {
        const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
        const endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;

        return this.prisma.$transaction(async (tx) => {
            const event = await tx.event.create({
                data: { name: dto.name, startsAt, endsAt },
                select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true },
            });

            // creator becomes OWNER
            await tx.eventMembership.create({
                data: { eventId: event.id, userId: actor.id, role: EventRole.OWNER },
            });

            // optional bootstrap: departments + assignments
            if (dto.departments?.length) {
                // create departments
                const createdDepts = await Promise.all(
                    dto.departments.map((d) =>
                        tx.department.create({
                            data: { eventId: event.id, name: d.name },
                            select: { id: true, name: true },
                        }),
                    ),
                );

                // index by name for quick lookup
                const nameToId = new Map(createdDepts.map((d) => [d.name, d.id]));

                // apply members
                for (const d of dto.departments) {
                    if (!d.members?.length) continue;
                    const deptId = nameToId.get(d.name)!;

                    for (const m of d.members) {
                        // validate role scoping
                        if (!EventsService.DEPT_SCOPED.has(m.role) && !EventsService.EVENT_SCOPED.has(m.role)) {
                            throw new BadRequestException(`Unsupported role: ${m.role}`);
                        }

                        const departmentId =
                            EventsService.DEPT_SCOPED.has(m.role) ? deptId : null;

                        await tx.eventMembership.upsert({
                            where: {
                                eventId_userId_departmentId: {
                                    eventId: event.id,
                                    userId: m.userId,
                                    // omit departmentId if null
                                    ...(departmentId ? { departmentId } : {}),
                                } as any,
                            },
                            update: { role: m.role, departmentId: departmentId ?? undefined },
                            create: {
                                eventId: event.id,
                                userId: m.userId,
                                role: m.role,
                                departmentId,
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
            select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true },
        });
        if (!e) throw new NotFoundException();
        return e;
    }

    async listForUser(viewer: { userId: string; isSuperAdmin: boolean }) {
        if (viewer.isSuperAdmin) {
            return this.prisma.event.findMany({
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true },
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
            select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true },
        });
    }

    async update(eventId: string, dto: UpdateEventDto, actor: { userId: string; isSuperAdmin: boolean }) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m) throw new NotFoundException();
            // ❌ was: if (![EventRole.OWNER, EventRole.PMO_ADMIN].includes(m.role)) { ... }
            if (!EventsService.ADMIN_ROLES.has(m.role)) {
                throw new ForbiddenException('Insufficient role');
            }
        }
        return this.prisma.event.update({
            where: { id: eventId },
            data: {
                name: dto.name,
                startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
                endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
                archivedAt: dto.archivedAt ? new Date(dto.archivedAt) : undefined,
            },
            select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true },
        });
    }

    async remove(eventId: string, actor: { userId: string; isSuperAdmin: boolean }) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m) throw new NotFoundException();
            if (m.role !== EventRole.OWNER) throw new ForbiddenException('Only OWNER can delete event');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.eventMembership.deleteMany({ where: { eventId } });
            await tx.department.deleteMany({ where: { eventId } });
            await tx.event.delete({ where: { id: eventId } });
        });
        return { ok: true };
    }

    /* ---------------- Memberships ---------------- */

    async addMember(eventId: string, dto: AddMemberDto, actor: { userId: string; isSuperAdmin: boolean }) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m) throw new NotFoundException();
            if (!EventsService.ADMIN_ROLES.has(m.role)) throw new ForbiddenException();
        }

        if (!actor.isSuperAdmin && dto.role === EventRole.OWNER) {
            const am = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!am || am.role !== EventRole.OWNER) throw new ForbiddenException('Only OWNER can assign OWNER');
        }

        return this.prisma.eventMembership.upsert({
            where: {
                eventId_userId_departmentId: {
                    eventId, userId: dto.userId, departmentId: (dto.departmentId ?? undefined) as string,
                }
            },
            update: { role: dto.role, departmentId: dto.departmentId ?? null },
            create: { eventId, userId: dto.userId, role: dto.role, departmentId: dto.departmentId ?? null },
            select: { id: true, userId: true, role: true, departmentId: true, eventId: true },
        });
    }

    async updateMember(eventId: string, userId: string, dto: UpdateMemberDto, actor: { userId: string; isSuperAdmin: boolean }) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m) throw new NotFoundException();
            if (!EventsService.ADMIN_ROLES.has(m.role)) throw new ForbiddenException();
            if (dto.role === EventRole.OWNER && m.role !== EventRole.OWNER) {
                throw new ForbiddenException('Only OWNER can assign OWNER');
            }
        }

        const mem = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!mem) throw new NotFoundException();

        return this.prisma.eventMembership.update({
            where: { id: mem.id },
            data: { role: dto.role, departmentId: dto.departmentId ?? null },
            select: { id: true, userId: true, role: true, departmentId: true, eventId: true },
        });
    }

    async removeMember(eventId: string, userId: string, actor: { userId: string; isSuperAdmin: boolean }) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m) throw new NotFoundException();
            if (!EventsService.ADMIN_ROLES.has(m.role)) throw new ForbiddenException();

            const target = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
            if (target?.role === EventRole.OWNER && m.role !== EventRole.OWNER) {
                throw new ForbiddenException('Only OWNER can remove OWNER');
            }
        }

        await this.prisma.eventMembership.deleteMany({ where: { eventId, userId } });
        return { ok: true };
    }

    async listMembers(eventId: string, viewer: { userId: string; isSuperAdmin: boolean }) {
        if (!viewer.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: viewer.userId } });
            if (!m) throw new NotFoundException();
        }
        return this.prisma.eventMembership.findMany({
            where: { eventId },
            select: {
                id: true,
                userId: true,
                role: true,
                departmentId: true,
                createdAt: true,
                user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true, designation: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
