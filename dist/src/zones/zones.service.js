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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZonesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ZonesService = class ZonesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    list(eventId) {
        return this.prisma.zone.findMany({ where: { eventId }, orderBy: { name: 'asc' }, select: { id: true, name: true, enabled: true } });
    }
    async create(eventId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const z = await tx.zone.create({ data: { eventId, name: dto.name.trim(), enabled: dto.enabled ?? true }, select: { id: true, name: true, enabled: true } });
            const templates = await tx.zonalDepartmentTemplate.findMany({ where: { eventId }, select: { id: true } });
            if (templates.length) {
                await tx.zoneZonalDepartment.createMany({ data: templates.map(t => ({ zoneId: z.id, zdeptId: t.id })), skipDuplicates: true });
            }
            return z;
        });
    }
    async update(eventId, zoneId, data) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        const payload = {};
        if (typeof data.name === 'string')
            payload.name = data.name.trim();
        if (typeof data.enabled === 'boolean')
            payload.enabled = data.enabled;
        return this.prisma.zone.update({ where: { id: zoneId }, data: payload, select: { id: true, name: true, enabled: true } });
    }
    async setZonesEnabled(eventId, enabled) {
        await this.prisma.event.update({ where: { id: eventId }, data: { zonesEnabled: enabled } });
        return { ok: true };
    }
    async listZoneDepartments(eventId, zoneId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            return [];
        const rows = await this.prisma.zoneDepartment.findMany({ where: { zoneId }, select: { departmentId: true } });
        return rows.map(r => r.departmentId);
    }
    async listZonalTemplates(eventId) {
        return this.prisma.zonalDepartmentTemplate.findMany({ where: { eventId }, orderBy: { name: 'asc' }, select: { id: true, name: true } });
    }
    async createZonalTemplate(eventId, name) {
        const trimmed = name.trim();
        return this.prisma.$transaction(async (tx) => {
            const t = await tx.zonalDepartmentTemplate.upsert({
                where: { eventId_name: { eventId, name: trimmed } },
                update: {},
                create: { eventId, name: trimmed },
                select: { id: true, name: true },
            });
            const zones = await tx.zone.findMany({ where: { eventId }, select: { id: true } });
            if (zones.length) {
                await tx.zoneZonalDepartment.createMany({
                    data: zones.map((z) => ({ zoneId: z.id, zdeptId: t.id })),
                    skipDuplicates: true,
                });
            }
            return t;
        });
    }
    async updateZonalTemplate(eventId, id, name) {
        const t = await this.prisma.zonalDepartmentTemplate.findFirst({ where: { id, eventId }, select: { id: true } });
        if (!t)
            throw new Error('Zonal department not found');
        const trimmed = name.trim();
        const dup = await this.prisma.zonalDepartmentTemplate.findFirst({ where: { eventId, name: trimmed, NOT: { id } }, select: { id: true } });
        if (dup)
            throw new Error('Name already exists');
        return this.prisma.zonalDepartmentTemplate.update({ where: { id }, data: { name: trimmed }, select: { id: true, name: true } });
    }
    async removeZonalTemplate(eventId, id) {
        const t = await this.prisma.zonalDepartmentTemplate.findFirst({ where: { id, eventId }, select: { id: true } });
        if (!t)
            throw new Error('Zonal department not found');
        return this.prisma.$transaction(async (tx) => {
            await tx.zoneZonalDepartment.deleteMany({ where: { zdeptId: id } });
            await tx.zonalDepartmentTemplate.delete({ where: { id } });
            return { ok: true };
        });
    }
    async listZoneZonalDepts(eventId, zoneId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            return [];
        const rows = await this.prisma.zoneZonalDepartment.findMany({
            where: { zoneId },
            include: { zdept: { select: { id: true, name: true } } },
        });
        rows.sort((a, b) => (a.zdept?.name || '').localeCompare(b.zdept?.name || ''));
        return rows.map((r) => ({ id: r.id, name: r.zdept?.name || '', templateId: r.zdeptId }));
    }
    async setZoneDepartments(eventId, zoneId, departmentIds) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        const validDepts = await this.prisma.department.findMany({ where: { eventId, id: { in: departmentIds } }, select: { id: true } });
        const ids = new Set(validDepts.map(d => d.id));
        return this.prisma.$transaction(async (tx) => {
            await tx.zoneDepartment.deleteMany({ where: { zoneId } });
            if (ids.size) {
                await tx.zoneDepartment.createMany({ data: Array.from(ids).map(id => ({ zoneId, departmentId: id })) });
            }
            return { ok: true };
        });
    }
    async listPOCs(eventId, zoneId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            return [];
        return this.prisma.zoneAssignment.findMany({
            where: { zoneId, role: 'POC' },
            select: { userId: true, role: true, user: { select: { id: true, fullName: true, email: true } } },
            orderBy: { user: { fullName: 'asc' } },
        });
    }
    async addPOC(eventId, zoneId, userId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!u)
            throw new Error('User not found');
        await this.prisma.zoneAssignment.upsert({
            where: { zoneId_userId: { zoneId, userId } },
            update: { role: 'POC' },
            create: { zoneId, userId, role: 'POC' },
        });
        return { ok: true };
    }
    async removePOC(eventId, zoneId, userId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        await this.prisma.zoneAssignment.delete({ where: { zoneId_userId: { zoneId, userId } } }).catch(() => { });
        return { ok: true };
    }
    async listZoneDeptMembers(eventId, zoneId, departmentId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            return [];
        const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId }, select: { id: true } });
        if (!d)
            return [];
        return this.prisma.zoneDeptAssignment.findMany({
            where: { zoneId, departmentId },
            select: { userId: true, role: true, user: { select: { id: true, fullName: true, email: true } } },
            orderBy: { user: { fullName: 'asc' } },
        });
    }
    async addZoneDeptMember(eventId, zoneId, departmentId, userId, role) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId }, select: { id: true } });
        if (!d)
            throw new Error('Department not found');
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!u)
            throw new Error('User not found');
        await this.prisma.zoneDeptAssignment.upsert({
            where: { zoneId_departmentId_userId: { zoneId, departmentId, userId } },
            update: { role },
            create: { zoneId, departmentId, userId, role },
        });
        return { ok: true };
    }
    async updateZoneDeptMember(eventId, zoneId, departmentId, userId, role) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        await this.prisma.zoneDeptAssignment.update({
            where: { zoneId_departmentId_userId: { zoneId, departmentId, userId } },
            data: { role },
        });
        return { ok: true };
    }
    async removeZoneDeptMember(eventId, zoneId, departmentId, userId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        await this.prisma.zoneDeptAssignment.delete({ where: { zoneId_departmentId_userId: { zoneId, departmentId, userId } } }).catch(() => { });
        return { ok: true };
    }
    async listAssignments(eventId, zoneId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            return [];
        return this.prisma.zoneAssignment.findMany({
            where: { zoneId },
            select: { userId: true, role: true, user: { select: { id: true, fullName: true, email: true } } },
            orderBy: { user: { fullName: 'asc' } },
        });
    }
    async addAssignment(eventId, zoneId, userId, role) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!u)
            throw new Error('User not found');
        await this.prisma.zoneAssignment.upsert({
            where: { zoneId_userId: { zoneId, userId } },
            update: { role },
            create: { zoneId, userId, role },
        });
        return { ok: true };
    }
    async updateAssignment(eventId, zoneId, userId, role) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        await this.prisma.zoneAssignment.update({ where: { zoneId_userId: { zoneId, userId } }, data: { role } });
        return { ok: true };
    }
    async removeAssignment(eventId, zoneId, userId) {
        const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
        if (!z)
            throw new Error('Zone not found');
        await this.prisma.zoneAssignment.delete({ where: { zoneId_userId: { zoneId, userId } } }).catch(() => { });
        return { ok: true };
    }
};
exports.ZonesService = ZonesService;
exports.ZonesService = ZonesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ZonesService);
//# sourceMappingURL=zones.service.js.map