import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { EventGuard } from '../common/guards/event.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskStatus } from '@prisma/client';
import { PermissionsService } from '../auth/permissions.service';
import { RequirePermission } from '../common/guards/permissions.guard';

import { PermissionsGuard } from '../common/guards/permissions.guard';
import { EventsService } from './events.service';

@Controller('events/:eventId/dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly eventsService: EventsService,
  ) { }

  @Get('summary')
  @RequirePermission('events', 'read')
  async summary(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
  ) {
    const scope = await this.eventsService.getAccessibleScope(eventId, user.sub, user.isSuperAdmin, user.isTenantManager);
    const whereBase: any = { eventId, deletedAt: null };

    if (!scope.all) {
      if (scope.departmentIds.length === 0) return { total: 0, completed: 0, overdue: 0, inProgress: 0, avgProgressPct: 0 };
      whereBase.departmentId = { in: scope.departmentIds };
    }

    const now = new Date();

    const [total, grouped, overdue, avg] = await Promise.all([
      this.prisma.task.count({ where: whereBase }),
      this.prisma.task.groupBy({ by: ['status'], where: whereBase, _count: { _all: true } }),
      this.prisma.task.count({ where: { ...whereBase, dueAt: { lt: now }, NOT: { status: { in: [TaskStatus.done, TaskStatus.canceled] } } } }),
      this.prisma.task.aggregate({ where: whereBase, _avg: { progressPct: true } }),
    ]);

    const map = new Map(grouped.map((g) => [g.status, g._count._all]));
    const completed = map.get(TaskStatus.done) || 0;
    const inProgress = map.get(TaskStatus.in_progress) || 0;
    const byStatus = {
      todo: map.get(TaskStatus.todo) || 0,
      in_progress: inProgress,
      blocked: map.get(TaskStatus.blocked) || 0,
      done: completed,
      canceled: map.get(TaskStatus.canceled) || 0,
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

  @Get('due-soon')
  @RequirePermission('events', 'read')
  async dueSoon(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
    @Query('days') days = '7',
  ) {
    const scope = await this.eventsService.getAccessibleScope(eventId, user.sub, user.isSuperAdmin, user.isTenantManager);
    const whereBase: any = { eventId, deletedAt: null };

    if (!scope.all) {
      if (scope.departmentIds.length === 0) return [];
      whereBase.departmentId = { in: scope.departmentIds };
    }

    const now = new Date();
    const end = new Date(now.getTime() + Math.max(1, Number(days)) * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.task.findMany({
      where: { ...whereBase, dueAt: { gte: now, lte: end }, NOT: { status: { in: [TaskStatus.done, TaskStatus.canceled] } } },
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

  @Get('recent')
  @RequirePermission('events', 'read')
  async recent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
  ) {
    const scope = await this.eventsService.getAccessibleScope(eventId, user.sub, user.isSuperAdmin, user.isTenantManager);
    const whereBase: any = { eventId, deletedAt: null };

    if (!scope.all) {
      if (scope.departmentIds.length === 0) return [];
      whereBase.departmentId = { in: scope.departmentIds };
    }

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

  @Get('dept-overview')
  @RequirePermission('events', 'read')
  async deptOverview(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
  ) {
    // Only admins can see all departments overview
    // Reuse scopeDepts: if mode != 'all', return []? or return stats for observable depts?
    // The previous logic was "Only admins can see ALL".
    // Let's allow users to see their own depts overview

    const scope = await this.eventsService.getAccessibleScope(eventId, user.sub, user.isSuperAdmin, user.isTenantManager);

    if (!scope.all && scope.departmentIds.length === 0) return [];

    const whereBase: any = { eventId, deletedAt: null };
    if (!scope.all) whereBase.departmentId = { in: scope.departmentIds };

    const totals = await this.prisma.task.groupBy({
      by: ['departmentId'],
      where: whereBase,
      _count: { _all: true },
      _avg: { progressPct: true },
    });
    const done = await this.prisma.task.groupBy({
      by: ['departmentId'],
      where: { ...whereBase, status: TaskStatus.done },
      _count: { _all: true },
    });
    const doneMap = new Map(done.map((r) => [r.departmentId, r._count._all]));
    const deptIds = totals.map((r) => r.departmentId);

    if (deptIds.length === 0) return [];

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

  @Get('my-tasks')
  @RequirePermission('events', 'read')
  async myTasks(
    @Param('eventId') eventId: string,
    @CurrentUser() user: any,
  ) {
    const rows = await this.prisma.task.findMany({
      where: { eventId, deletedAt: null, assigneeId: user.sub, NOT: { status: TaskStatus.done } },
      orderBy: [
        { status: 'asc' }, // naive sort; done excluded
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
}
