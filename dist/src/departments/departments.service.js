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
var DepartmentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DepartmentsService = class DepartmentsService {
    static { DepartmentsService_1 = this; }
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    static ADMIN_ROLES = new Set([client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN]);
    static DEPT_SCOPED = new Set([
        client_1.EventRole.DEPT_HEAD,
        client_1.EventRole.DEPT_MEMBER,
        client_1.EventRole.OBSERVER,
    ]);
    async assertAdmin(eventId, userId, isSuperAdmin) {
        if (isSuperAdmin)
            return;
        const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!m)
            throw new common_1.NotFoundException();
        if (!DepartmentsService_1.ADMIN_ROLES.has(m.role))
            throw new common_1.ForbiddenException('Insufficient role');
    }
    async assertMember(eventId, userId, isSuperAdmin) {
        if (isSuperAdmin)
            return;
        const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!m)
            throw new common_1.NotFoundException();
    }
    async list(eventId, viewer) {
        await this.assertMember(eventId, viewer.userId, viewer.isSuperAdmin);
        return this.prisma.department.findMany({
            where: { eventId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
    }
    async create(eventId, dto, actor) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        return this.prisma.department.create({
            data: { eventId, name: dto.name },
            select: { id: true, name: true },
        });
    }
    async update(eventId, departmentId, dto, actor) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId } });
        if (!d)
            throw new common_1.NotFoundException();
        return this.prisma.department.update({
            where: { id: departmentId },
            data: { name: dto.name },
            select: { id: true, name: true },
        });
    }
    async remove(eventId, departmentId, actor) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId } });
        if (!d)
            throw new common_1.NotFoundException();
        await this.prisma.$transaction(async (tx) => {
            await tx.eventMembership.deleteMany({ where: { eventId, departmentId } });
            await tx.department.delete({ where: { id: departmentId } });
        });
        return { ok: true };
    }
    async listMembers(eventId, departmentId, viewer) {
        await this.assertMember(eventId, viewer.userId, viewer.isSuperAdmin);
        return this.prisma.eventMembership.findMany({
            where: { eventId, departmentId },
            select: {
                id: true,
                userId: true,
                role: true,
                departmentId: true,
                createdAt: true,
                user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addMember(eventId, departmentId, dto, actor) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        if (!DepartmentsService_1.DEPT_SCOPED.has(dto.role)) {
            throw new common_1.BadRequestException('Role must be dept-scoped (DEPT_HEAD | DEPT_MEMBER | OBSERVER)');
        }
        return this.prisma.eventMembership.upsert({
            where: {
                eventId_userId_departmentId: { eventId, userId: dto.userId, departmentId },
            },
            update: { role: dto.role },
            create: { eventId, userId: dto.userId, role: dto.role, departmentId },
            select: { id: true, userId: true, role: true, departmentId: true },
        });
    }
    async updateMember(eventId, departmentId, userId, dto, actor) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        if (!DepartmentsService_1.DEPT_SCOPED.has(dto.role)) {
            throw new common_1.BadRequestException('Role must be dept-scoped (DEPT_HEAD | DEPT_MEMBER | OBSERVER)');
        }
        const mem = await this.prisma.eventMembership.findFirst({ where: { eventId, departmentId, userId } });
        if (!mem)
            throw new common_1.NotFoundException();
        return this.prisma.eventMembership.update({
            where: { id: mem.id },
            data: { role: dto.role },
            select: { id: true, userId: true, role: true, departmentId: true },
        });
    }
    async removeMember(eventId, departmentId, userId, actor) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        await this.prisma.eventMembership.deleteMany({ where: { eventId, departmentId, userId } });
        return { ok: true };
    }
    async listAssignable(eventId, departmentId, viewer, q) {
        await this.assertMember(eventId, viewer.userId, viewer.isSuperAdmin);
        const members = await this.prisma.eventMembership.findMany({
            where: { eventId, departmentId: null },
            include: { user: { select: { id: true, fullName: true, email: true } } },
        });
        const filtered = q
            ? members.filter(m => m.user.fullName.toLowerCase().includes(q.toLowerCase()) ||
                m.user.email.toLowerCase().includes(q.toLowerCase()))
            : members;
        return filtered.map(m => ({ userId: m.user.id, fullName: m.user.fullName, email: m.user.email }));
    }
    async bulkAddMembers(eventId, departmentId, items, actor) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        if (!items.length)
            return { added: 0 };
        await this.prisma.$transaction(items.map(i => this.prisma.eventMembership.upsert({
            where: { eventId_userId_departmentId: { eventId, userId: i.userId, departmentId } },
            update: { role: i.role },
            create: { eventId, userId: i.userId, role: i.role, departmentId },
        })));
        return { added: items.length };
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = DepartmentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map