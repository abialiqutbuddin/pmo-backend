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
exports.IssuesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const rules_1 = require("../common/rbac/rules");
const client_1 = require("@prisma/client");
let IssuesService = class IssuesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getActorRole(eventId, departmentId, actor) {
        if (actor.isSuperAdmin)
            return { role: 'SUPER', sameDept: true };
        const memberships = await this.prisma.eventMembership.findMany({
            where: { eventId, userId: actor.userId },
            select: { role: true, departmentId: true },
        });
        if (!memberships.length)
            throw new common_1.NotFoundException();
        const hasAdmin = memberships.some(m => rules_1.ADMIN_ROLES.has(m.role));
        const sameDept = memberships.some(m => m.departmentId === departmentId);
        const topRole = hasAdmin
            ? client_1.EventRole.PMO_ADMIN
            : (memberships.find(m => m.departmentId === departmentId)?.role ??
                memberships[0].role);
        return { role: topRole, sameDept };
    }
    async list(eventId, departmentId, actor, opts = {}) {
        await this.getActorRole(eventId, departmentId, actor);
        const take = Math.min(Math.max((opts.take ?? 20), 1), 100);
        const where = { eventId, departmentId, deletedAt: null };
        return this.prisma.issue.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
            ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
            select: {
                id: true, title: true, description: true, severity: true, status: true,
                reporterId: true, createdAt: true, updatedAt: true, closedAt: true,
            },
        });
    }
    async create(eventId, departmentId, actor, dto) {
        const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
        const canCreate = role === 'SUPER' || rules_1.ADMIN_ROLES.has(role) || (sameDept && role);
        if (!canCreate)
            throw new common_1.ForbiddenException('Insufficient role to create issue');
        return this.prisma.issue.create({
            data: {
                eventId,
                departmentId,
                reporterId: actor.userId,
                title: dto.title,
                description: dto.description,
                severity: dto.severity ?? 'normal',
            },
            select: { id: true, title: true, severity: true, status: true, createdAt: true },
        });
    }
    async get(eventId, departmentId, issueId, actor) {
        await this.getActorRole(eventId, departmentId, actor);
        const issue = await this.prisma.issue.findFirst({ where: { id: issueId, eventId, departmentId, deletedAt: null } });
        if (!issue)
            throw new common_1.NotFoundException();
        return issue;
    }
    async update(eventId, departmentId, issueId, actor, dto) {
        const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
        const issue = await this.prisma.issue.findFirst({ where: { id: issueId, eventId, departmentId, deletedAt: null } });
        if (!issue)
            throw new common_1.NotFoundException();
        if (role !== 'SUPER' && !(0, rules_1.canUpdateIssue)(role, issue, actor.userId, sameDept)) {
            throw new common_1.ForbiddenException('Cannot update this issue');
        }
        return this.prisma.issue.update({
            where: { id: issue.id },
            data: { title: dto.title, description: dto.description, severity: dto.severity },
            select: { id: true, title: true, severity: true, status: true, updatedAt: true },
        });
    }
    async changeStatus(eventId, departmentId, issueId, actor, dto) {
        const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
        const issue = await this.prisma.issue.findFirst({ where: { id: issueId, eventId, departmentId, deletedAt: null } });
        if (!issue)
            throw new common_1.NotFoundException();
        if (role !== 'SUPER' && !(0, rules_1.canUpdateIssue)(role, issue, actor.userId, sameDept)) {
            throw new common_1.ForbiddenException('Cannot update this issue');
        }
        const data = { status: dto.status };
        if (dto.status === 'closed')
            data.closedAt = new Date();
        return this.prisma.issue.update({
            where: { id: issue.id },
            data,
            select: { id: true, status: true, closedAt: true, updatedAt: true },
        });
    }
    async remove(eventId, departmentId, issueId, actor) {
        const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
        const issue = await this.prisma.issue.findFirst({ where: { id: issueId, eventId, departmentId, deletedAt: null } });
        if (!issue)
            throw new common_1.NotFoundException();
        if (role !== 'SUPER' && !(0, rules_1.canDeleteIssue)(role, issue, actor.userId, sameDept)) {
            throw new common_1.ForbiddenException('Cannot delete this issue');
        }
        await this.prisma.issue.update({
            where: { id: issue.id },
            data: { deletedAt: new Date() },
        });
        return { ok: true };
    }
};
exports.IssuesService = IssuesService;
exports.IssuesService = IssuesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IssuesService);
//# sourceMappingURL=issues.service.js.map