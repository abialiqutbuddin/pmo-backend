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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const event_guard_1 = require("../common/guards/event.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const rules_1 = require("../common/rbac/rules");
const client_1 = require("@prisma/client");
let DashboardController = class DashboardController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async scopeDepts(eventId, actor) {
        if (actor.isSuperAdmin)
            return { mode: 'all', deptIds: [] };
        const memberships = await this.prisma.eventMembership.findMany({
            where: { eventId, userId: actor.id },
            select: { role: true, departmentId: true },
        });
        const isAdmin = memberships.some((m) => rules_1.ADMIN_ROLES.has(m.role));
        if (isAdmin)
            return { mode: 'all', deptIds: [] };
        const deptIds = Array.from(new Set(memberships.map((m) => m.departmentId).filter(Boolean)));
        if (deptIds.length === 0)
            return { mode: 'none', deptIds: [] };
        return { mode: 'depts', deptIds };
    }
    async summary(eventId, user) {
        const scope = await this.scopeDepts(eventId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
        const whereBase = { eventId, deletedAt: null };
        if (scope.mode === 'depts')
            whereBase.departmentId = { in: scope.deptIds };
        if (scope.mode === 'none')
            return { total: 0, completed: 0, overdue: 0, inProgress: 0, avgProgressPct: 0 };
        const now = new Date();
        const [total, grouped, overdue, avg] = await Promise.all([
            this.prisma.task.count({ where: whereBase }),
            this.prisma.task.groupBy({ by: ['status'], where: whereBase, _count: { _all: true } }),
            this.prisma.task.count({ where: { ...whereBase, dueAt: { lt: now }, NOT: { status: { in: [client_1.TaskStatus.done, client_1.TaskStatus.canceled] } } } }),
            this.prisma.task.aggregate({ where: whereBase, _avg: { progressPct: true } }),
        ]);
        const map = new Map(grouped.map((g) => [g.status, g._count._all]));
        const completed = map.get(client_1.TaskStatus.done) || 0;
        const inProgress = map.get(client_1.TaskStatus.in_progress) || 0;
        const byStatus = {
            todo: map.get(client_1.TaskStatus.todo) || 0,
            in_progress: inProgress,
            blocked: map.get(client_1.TaskStatus.blocked) || 0,
            done: completed,
            canceled: map.get(client_1.TaskStatus.canceled) || 0,
        };
        return {
            total,
            completed,
            inProgress,
            overdue,
            avgProgressPct: Math.round((avg._avg.progressPct || 0)),
            byStatus,
        };
    }
    async dueSoon(eventId, user, days = '7') {
        const scope = await this.scopeDepts(eventId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
        const whereBase = { eventId, deletedAt: null };
        if (scope.mode === 'depts')
            whereBase.departmentId = { in: scope.deptIds };
        if (scope.mode === 'none')
            return [];
        const now = new Date();
        const end = new Date(now.getTime() + Math.max(1, Number(days)) * 24 * 60 * 60 * 1000);
        const rows = await this.prisma.task.findMany({
            where: { ...whereBase, dueAt: { gte: now, lte: end }, NOT: { status: { in: [client_1.TaskStatus.done, client_1.TaskStatus.canceled] } } },
            orderBy: { dueAt: 'asc' },
            take: 10,
            select: {
                id: true, title: true, status: true, dueAt: true, priority: true,
                departmentId: true, assigneeId: true,
                department: { select: { name: true } },
                assignee: { select: { fullName: true } },
            },
        });
        return rows.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            dueAt: r.dueAt,
            priority: r.priority,
            departmentId: r.departmentId,
            departmentName: r.department?.name || '',
            assigneeId: r.assigneeId,
            assigneeName: r.assignee?.fullName || null,
        }));
    }
    async recent(eventId, user) {
        const scope = await this.scopeDepts(eventId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
        const whereBase = { eventId, deletedAt: null };
        if (scope.mode === 'depts')
            whereBase.departmentId = { in: scope.deptIds };
        if (scope.mode === 'none')
            return [];
        const rows = await this.prisma.task.findMany({
            where: whereBase,
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
                id: true, title: true, status: true, updatedAt: true, progressPct: true,
                department: { select: { name: true } },
                assignee: { select: { fullName: true } },
            },
        });
        return rows.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            updatedAt: r.updatedAt,
            progressPct: r.progressPct,
            departmentName: r.department?.name || '',
            assigneeName: r.assignee?.fullName || null,
        }));
    }
    async deptOverview(eventId, user) {
        const memberships = await this.prisma.eventMembership.findMany({
            where: { eventId, userId: user.sub },
            select: { role: true },
        });
        const isAdmin = user.isSuperAdmin || memberships.some((m) => rules_1.ADMIN_ROLES.has(m.role));
        if (!isAdmin)
            return [];
        const whereBase = { eventId, deletedAt: null };
        const totals = await this.prisma.task.groupBy({
            by: ['departmentId'],
            where: whereBase,
            _count: { _all: true },
            _avg: { progressPct: true },
        });
        const done = await this.prisma.task.groupBy({
            by: ['departmentId'],
            where: { ...whereBase, status: client_1.TaskStatus.done },
            _count: { _all: true },
        });
        const doneMap = new Map(done.map((r) => [r.departmentId, r._count._all]));
        const deptIds = totals.map((r) => r.departmentId);
        const names = await this.prisma.department.findMany({
            where: { id: { in: deptIds } },
            select: { id: true, name: true },
        });
        const nameMap = new Map(names.map((d) => [d.id, d.name]));
        return totals.map((r) => ({
            departmentId: r.departmentId,
            name: nameMap.get(r.departmentId) || r.departmentId,
            total: r._count._all,
            done: doneMap.get(r.departmentId) || 0,
            avgProgressPct: Math.round(r._avg.progressPct || 0),
        }));
    }
    async myTasks(eventId, user) {
        const rows = await this.prisma.task.findMany({
            where: { eventId, deletedAt: null, assigneeId: user.sub, NOT: { status: client_1.TaskStatus.done } },
            orderBy: [
                { status: 'asc' },
                { dueAt: 'asc' },
                { updatedAt: 'desc' },
            ],
            take: 10,
            select: { id: true, title: true, status: true, dueAt: true, progressPct: true, priority: true, department: { select: { name: true } } },
        });
        return rows.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            dueAt: r.dueAt,
            progressPct: r.progressPct,
            priority: r.priority,
            departmentName: r.department?.name || '',
        }));
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "summary", null);
__decorate([
    (0, common_1.Get)('due-soon'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "dueSoon", null);
__decorate([
    (0, common_1.Get)('recent'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "recent", null);
__decorate([
    (0, common_1.Get)('dept-overview'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "deptOverview", null);
__decorate([
    (0, common_1.Get)('my-tasks'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "myTasks", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('events/:eventId/dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map