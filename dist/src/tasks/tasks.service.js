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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const rules_1 = require("../common/rbac/rules");
const client_1 = require("@prisma/client");
let TasksService = class TasksService {
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
        const { role } = await this.getActorRole(eventId, departmentId, actor);
        const take = Math.min(Math.max(opts.take ?? 20, 1), 100);
        const where = { eventId, departmentId, deletedAt: null };
        if (role === 'SUPER' || rules_1.ADMIN_ROLES.has(role) || role === client_1.EventRole.DEPT_HEAD) {
            if (opts.assigneeId)
                where.assigneeId = opts.assigneeId;
        }
        else if (role === client_1.EventRole.DEPT_MEMBER) {
            where.assigneeId = actor.userId;
        }
        const tasks = await this.prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
            ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
            select: {
                id: true,
                title: true,
                description: true,
                priority: true,
                status: true,
                progressPct: true,
                type: true,
                startAt: true,
                dueAt: true,
                createdAt: true,
                updatedAt: true,
                assigneeId: true,
                creatorId: true,
                venueId: true,
            },
        });
        return tasks;
    }
    async create(eventId, departmentId, actor, dto) {
        const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
        if (role !== 'SUPER' && !(0, rules_1.canCreateInDept)(role)) {
            throw new common_1.ForbiddenException('Insufficient role to create task');
        }
        if (role !== 'SUPER' && role === client_1.EventRole.DEPT_MEMBER && !sameDept) {
            throw new common_1.ForbiddenException('Not a member of this department');
        }
        const data = {
            eventId,
            departmentId,
            creatorId: actor.userId,
            title: dto.title,
            description: dto.description,
            priority: dto.priority ?? 3,
            type: dto.type ?? undefined,
            startAt: dto.startAt ? new Date(dto.startAt) : undefined,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
            assigneeId: dto.assigneeId,
            venueId: dto.venueId,
        };
        return this.prisma.task.create({
            data,
            select: { id: true, title: true, status: true, priority: true, assigneeId: true, createdAt: true },
        });
    }
    async get(eventId, departmentId, taskId, actor) {
        const { role } = await this.getActorRole(eventId, departmentId, actor);
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, eventId, departmentId, deletedAt: null },
        });
        if (!task)
            throw new common_1.NotFoundException();
        if (!(role === 'SUPER' || rules_1.ADMIN_ROLES.has(role) || role === client_1.EventRole.DEPT_HEAD)) {
            if (role === client_1.EventRole.DEPT_MEMBER) {
                if (task.assigneeId !== actor.userId && task.creatorId !== actor.userId) {
                    throw new common_1.ForbiddenException('Cannot view this task');
                }
            }
        }
        return task;
    }
    async update(eventId, departmentId, taskId, actor, dto) {
        const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
        const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
        if (!task)
            throw new common_1.NotFoundException();
        if (role !== 'SUPER' && !(0, rules_1.canUpdateTask)(role, task, actor.userId, sameDept)) {
            throw new common_1.ForbiddenException('Cannot update this task');
        }
        const data = {
            title: dto.title,
            description: dto.description,
            priority: dto.priority,
            type: dto.type === null ? null : dto.type ?? undefined,
            startAt: dto.startAt === null ? null : dto.startAt ? new Date(dto.startAt) : undefined,
            dueAt: dto.dueAt === null ? null : dto.dueAt ? new Date(dto.dueAt) : undefined,
            assigneeId: dto.assigneeId === null ? null : dto.assigneeId ?? undefined,
            venueId: dto.venueId === null ? null : dto.venueId ?? undefined,
        };
        return this.prisma.task.update({
            where: { id: task.id },
            data,
            select: { id: true, title: true, status: true, priority: true, assigneeId: true, updatedAt: true },
        });
    }
    async changeStatus(eventId, departmentId, taskId, actor, dto) {
        const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
        const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
        if (!task)
            throw new common_1.NotFoundException();
        if (role !== 'SUPER' && !(0, rules_1.canUpdateTask)(role, task, actor.userId, sameDept)) {
            throw new common_1.ForbiddenException('Cannot update this task');
        }
        const data = { status: dto.status };
        if (typeof dto.progressPct === 'number') {
            if (dto.progressPct < 0 || dto.progressPct > 100)
                throw new common_1.BadRequestException('progressPct 0..100');
            data.progressPct = dto.progressPct;
        }
        if (dto.status === client_1.TaskStatus.done)
            data.completedAt = new Date();
        return this.prisma.task.update({
            where: { id: task.id },
            data,
            select: { id: true, status: true, progressPct: true, completedAt: true, updatedAt: true },
        });
    }
    async remove(eventId, departmentId, taskId, actor) {
        const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
        const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
        if (!task)
            throw new common_1.NotFoundException();
        if (role !== 'SUPER' && !(0, rules_1.canDeleteTask)(role, task, actor.userId, sameDept)) {
            throw new common_1.ForbiddenException('Cannot delete this task');
        }
        await this.prisma.task.update({
            where: { id: task.id },
            data: { deletedAt: new Date() },
        });
        return { ok: true };
    }
    async listDependencies(eventId, departmentId, taskId, actor) {
        await this.getActorRole(eventId, departmentId, actor);
        const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
        if (!task)
            throw new common_1.NotFoundException();
        const blockers = await this.prisma.taskDependency.findMany({
            where: { downstreamId: task.id },
            include: { upstream: { select: { id: true, title: true, status: true, priority: true, dueAt: true } } },
        });
        const dependents = await this.prisma.taskDependency.findMany({
            where: { upstreamId: task.id },
            include: { downstream: { select: { id: true, title: true, status: true, priority: true, dueAt: true } } },
        });
        return {
            blockers: blockers.map((d) => ({ upstreamId: d.upstreamId, depType: d.depType, task: d.upstream })),
            dependents: dependents.map((d) => ({ downstreamId: d.downstreamId, depType: d.depType, task: d.downstream })),
        };
    }
    async addDependency(eventId, departmentId, taskId, actor, dto) {
        const { role } = await this.getActorRole(eventId, departmentId, actor);
        if (role !== 'SUPER' && !(rules_1.ADMIN_ROLES.has(role) || role === client_1.EventRole.DEPT_HEAD)) {
            throw new common_1.ForbiddenException('Insufficient role to link dependency');
        }
        const downstream = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
        if (!downstream)
            throw new common_1.NotFoundException('Task not found');
        const upstream = await this.prisma.task.findFirst({ where: { id: dto.upstreamId, eventId, deletedAt: null } });
        if (!upstream)
            throw new common_1.NotFoundException('Upstream task not found');
        if (upstream.id === downstream.id)
            throw new common_1.BadRequestException('Cannot depend on itself');
        await this.prisma.taskDependency.create({
            data: { upstreamId: upstream.id, downstreamId: downstream.id, depType: dto.depType },
        }).catch((e) => {
            if (String(e?.code) === 'P2002')
                return;
            throw e;
        });
        return { ok: true };
    }
    async removeDependency(eventId, departmentId, taskId, actor, dto) {
        const { role } = await this.getActorRole(eventId, departmentId, actor);
        if (role !== 'SUPER' && !(rules_1.ADMIN_ROLES.has(role) || role === client_1.EventRole.DEPT_HEAD)) {
            throw new common_1.ForbiddenException('Insufficient role to unlink dependency');
        }
        const downstream = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
        if (!downstream)
            throw new common_1.NotFoundException('Task not found');
        await this.prisma.taskDependency.deleteMany({ where: { upstreamId: dto.upstreamId, downstreamId: downstream.id } });
        return { ok: true };
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map