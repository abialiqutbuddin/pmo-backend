"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let EventsService = class EventsService {
    static { EventsService_1 = this; }
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    static ADMIN_ROLES = new Set([
        client_1.EventRole.OWNER,
        client_1.EventRole.PMO_ADMIN,
    ]);
    static DEPT_SCOPED = new Set([
        client_1.EventRole.DEPT_HEAD,
        client_1.EventRole.DEPT_MEMBER,
        client_1.EventRole.OBSERVER,
    ]);
    static EVENT_SCOPED = new Set([
        client_1.EventRole.OWNER,
        client_1.EventRole.PMO_ADMIN,
        client_1.EventRole.PMO_POC,
        client_1.EventRole.GUEST,
    ]);
    async create(dto, actor) {
        const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
        const endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
        return this.prisma.$transaction(async (tx) => {
            const event = await tx.event.create({
                data: { name: dto.name, startsAt, endsAt },
                select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true },
            });
            await tx.eventMembership.create({
                data: { eventId: event.id, userId: actor.id, role: client_1.EventRole.OWNER },
            });
            if (dto.departments?.length) {
                const createdDepts = await Promise.all(dto.departments.map((d) => tx.department.create({
                    data: { eventId: event.id, name: d.name },
                    select: { id: true, name: true },
                })));
                const nameToId = new Map(createdDepts.map((d) => [d.name, d.id]));
                for (const d of dto.departments) {
                    if (!d.members?.length)
                        continue;
                    const deptId = nameToId.get(d.name);
                    for (const m of d.members) {
                        if (!EventsService_1.DEPT_SCOPED.has(m.role) && !EventsService_1.EVENT_SCOPED.has(m.role)) {
                            throw new common_1.BadRequestException(`Unsupported role: ${m.role}`);
                        }
                        const departmentId = EventsService_1.DEPT_SCOPED.has(m.role) ? deptId : null;
                        await tx.eventMembership.upsert({
                            where: {
                                eventId_userId_departmentId: {
                                    eventId: event.id,
                                    userId: m.userId,
                                    ...(departmentId ? { departmentId } : {}),
                                },
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
    async get(eventId, viewer) {
        if (!viewer.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: viewer.userId } });
            if (!m)
                throw new common_1.NotFoundException();
        }
        const e = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true, zonesEnabled: true },
        });
        if (!e)
            throw new common_1.NotFoundException();
        return e;
    }
    async listForUser(viewer) {
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
        if (!ids.length)
            return [];
        return this.prisma.event.findMany({
            where: { id: { in: ids } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, startsAt: true, endsAt: true, createdAt: true, archivedAt: true },
        });
    }
    async update(eventId, dto, actor) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m)
                throw new common_1.NotFoundException();
            if (!EventsService_1.ADMIN_ROLES.has(m.role)) {
                throw new common_1.ForbiddenException('Insufficient role');
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
    async remove(eventId, actor) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m)
                throw new common_1.NotFoundException();
            if (m.role !== client_1.EventRole.OWNER)
                throw new common_1.ForbiddenException('Only OWNER can delete event');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.eventMembership.deleteMany({ where: { eventId } });
            await tx.department.deleteMany({ where: { eventId } });
            await tx.event.delete({ where: { id: eventId } });
        });
        return { ok: true };
    }
    async addMember(eventId, dto, actor) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m)
                throw new common_1.NotFoundException();
            if (!EventsService_1.ADMIN_ROLES.has(m.role))
                throw new common_1.ForbiddenException();
        }
        if (!actor.isSuperAdmin && dto.role === client_1.EventRole.OWNER) {
            const am = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!am || am.role !== client_1.EventRole.OWNER)
                throw new common_1.ForbiddenException('Only OWNER can assign OWNER');
        }
        return this.prisma.eventMembership.upsert({
            where: {
                eventId_userId_departmentId: {
                    eventId, userId: dto.userId, departmentId: (dto.departmentId ?? undefined),
                }
            },
            update: { role: dto.role, departmentId: dto.departmentId ?? null },
            create: { eventId, userId: dto.userId, role: dto.role, departmentId: dto.departmentId ?? null },
            select: { id: true, userId: true, role: true, departmentId: true, eventId: true },
        });
    }
    async updateMember(eventId, userId, dto, actor) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m)
                throw new common_1.NotFoundException();
            if (!EventsService_1.ADMIN_ROLES.has(m.role))
                throw new common_1.ForbiddenException();
            if (dto.role === client_1.EventRole.OWNER && m.role !== client_1.EventRole.OWNER) {
                throw new common_1.ForbiddenException('Only OWNER can assign OWNER');
            }
        }
        const mem = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!mem)
            throw new common_1.NotFoundException();
        return this.prisma.eventMembership.update({
            where: { id: mem.id },
            data: { role: dto.role, departmentId: dto.departmentId ?? null },
            select: { id: true, userId: true, role: true, departmentId: true, eventId: true },
        });
    }
    async removeMember(eventId, userId, actor) {
        if (!actor.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: actor.userId } });
            if (!m)
                throw new common_1.NotFoundException();
            if (!EventsService_1.ADMIN_ROLES.has(m.role))
                throw new common_1.ForbiddenException();
            const target = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
            if (target?.role === client_1.EventRole.OWNER && m.role !== client_1.EventRole.OWNER) {
                throw new common_1.ForbiddenException('Only OWNER can remove OWNER');
            }
        }
        await this.prisma.eventMembership.deleteMany({ where: { eventId, userId } });
        return { ok: true };
    }
    async listMembers(eventId, viewer) {
        if (!viewer.isSuperAdmin) {
            const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId: viewer.userId } });
            if (!m)
                throw new common_1.NotFoundException();
        }
        const rows = await this.prisma.eventMembership.findMany({
            where: { eventId },
            select: {
                userId: true,
                user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true, designation: true } },
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        const byUser = new Map();
        for (const r of rows) {
            if (!byUser.has(r.userId))
                byUser.set(r.userId, { userId: r.userId, user: r.user });
        }
        return Array.from(byUser.values()).sort((a, b) => (a.user?.fullName || '').localeCompare(b.user?.fullName || ''));
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventsService);
//# sourceMappingURL=events.service.js.map