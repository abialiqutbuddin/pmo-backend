import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { ADMIN_ROLES, canCreateInDept, canDeleteTask, canUpdateTask, canManageInDept } from '../common/rbac/rules';
import { DependencyType, EventRole, TaskStatus } from '@prisma/client';
import { AddDependencyDto } from './dto/dependencies/add-dependency.dto';
import { RemoveDependencyDto } from './dto/dependencies/remove-dependency.dto';

type Actor = { userId: string; isSuperAdmin: boolean };

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActorRole(eventId: string, departmentId: string, actor: Actor) {
    if (actor.isSuperAdmin) return { role: 'SUPER' as const, sameDept: true };
    const memberships = await this.prisma.eventMembership.findMany({
      where: { eventId, userId: actor.userId },
      select: { role: true, departmentId: true },
    });
    if (!memberships.length) throw new NotFoundException(); // hide event
    // derive highest privilege + sameDept flag
    const hasAdmin = memberships.some(m => ADMIN_ROLES.has(m.role));
    const sameDept = memberships.some(m => m.departmentId === departmentId);
    const topRole: EventRole = hasAdmin
      ? EventRole.PMO_ADMIN
      : (memberships.find(m => m.departmentId === departmentId)?.role ??
         memberships[0].role);
    return { role: topRole, sameDept };
  }

  /* ---------- List (with pagination) ---------- */
  async list(
    eventId: string,
    departmentId: string,
    actor: Actor,
    opts: { cursor?: string; take?: number; assigneeId?: string; zoneId?: string; zonalDeptRowId?: string } = {},
  ) {
    // must be at least a member of the event; also figure out role
    const { role } = await this.getActorRole(eventId, departmentId, actor);

    const take = Math.min(Math.max(opts.take ?? 20, 1), 100);
    const where: any = { eventId, departmentId, deletedAt: null as Date | null };
    if (opts.zoneId) where.zoneId = opts.zoneId;
    if (opts.zonalDeptRowId) where.zonalDeptRowId = opts.zonalDeptRowId;

    // Enforce visibility rules:
    // - SUPER/ADMIN/DEPT_HEAD can see all; if assigneeId provided, filter by it
    // - DEPT_MEMBER only sees tasks assigned to themselves
    if (role === 'SUPER' || ADMIN_ROLES.has(role as EventRole) || (role as EventRole) === EventRole.DEPT_HEAD) {
      if (opts.assigneeId) where.assigneeId = opts.assigneeId;
    } else if ((role as EventRole) === EventRole.DEPT_MEMBER) {
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
        zoneId: true,
        venueId: true,
        zonalDeptRowId: true,
      },
    });
    return tasks;
  }

  /* ---------- Create ---------- */
  async create(eventId: string, departmentId: string, actor: Actor, dto: CreateTaskDto) {
    const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
    if (role !== 'SUPER' && !canCreateInDept(role as EventRole)) {
      throw new ForbiddenException('Insufficient role to create task');
    }
    if (role !== 'SUPER' && (role as EventRole) === EventRole.DEPT_MEMBER && !sameDept) {
      throw new ForbiddenException('Not a member of this department');
    }

    const data: any = {
      eventId,
      departmentId,
      creatorId: actor.userId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority ?? 3,
      type: (dto as any).type ?? undefined,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      assigneeId: dto.assigneeId,
      zoneId: dto.zoneId,
      zonalDeptRowId: (dto as any).zonalDeptRowId,
      venueId: dto.venueId,
    };
    return this.prisma.task.create({
      data,
      select: { id: true, title: true, status: true, priority: true, assigneeId: true, createdAt: true },
    });
  }

  /* ---------- Get ---------- */
  async get(eventId: string, departmentId: string, taskId: string, actor: Actor) {
    const { role } = await this.getActorRole(eventId, departmentId, actor);
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, eventId, departmentId, deletedAt: null },
    });
    if (!task) throw new NotFoundException();
    // Visibility for single task: members can only view their assigned or created tasks
    if (!(role === 'SUPER' || ADMIN_ROLES.has(role as EventRole) || (role as EventRole) === EventRole.DEPT_HEAD)) {
      if ((role as EventRole) === EventRole.DEPT_MEMBER) {
        if (task.assigneeId !== actor.userId && task.creatorId !== actor.userId) {
          throw new ForbiddenException('Cannot view this task');
        }
      }
    }
    return task;
  }

  /* ---------- Update ---------- */
  async update(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: UpdateTaskDto) {
    const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
    if (!task) throw new NotFoundException();

    if (role !== 'SUPER' && !canUpdateTask(role as EventRole, task, actor.userId, sameDept)) {
      throw new ForbiddenException('Cannot update this task');
    }

    const data: any = {
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      type: dto.type === null ? null : dto.type ?? undefined,
      startAt: dto.startAt === null ? null : dto.startAt ? new Date(dto.startAt) : undefined,
      dueAt: dto.dueAt === null ? null : dto.dueAt ? new Date(dto.dueAt) : undefined,
      assigneeId: dto.assigneeId === null ? null : dto.assigneeId ?? undefined,
      zoneId: (dto as any).zoneId === null ? null : (dto as any).zoneId ?? undefined,
      zonalDeptRowId: (dto as any).zonalDeptRowId === null ? null : (dto as any).zonalDeptRowId ?? undefined,
      venueId: dto.venueId === null ? null : dto.venueId ?? undefined,
    };

    return this.prisma.task.update({
      where: { id: task.id },
      data,
      select: { id: true, title: true, status: true, priority: true, assigneeId: true, updatedAt: true },
    });
  }

  /* ---------- Change Status ---------- */
  async changeStatus(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: ChangeTaskStatusDto) {
    const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
    if (!task) throw new NotFoundException();

    if (role !== 'SUPER' && !canUpdateTask(role as EventRole, task, actor.userId, sameDept)) {
      throw new ForbiddenException('Cannot update this task');
    }

    const data: any = { status: dto.status };
    if (typeof dto.progressPct === 'number') {
      if (dto.progressPct < 0 || dto.progressPct > 100) throw new BadRequestException('progressPct 0..100');
      data.progressPct = dto.progressPct;
    }
    if (dto.status === TaskStatus.done) data.completedAt = new Date();

    return this.prisma.task.update({
      where: { id: task.id },
      data,
      select: { id: true, status: true, progressPct: true, completedAt: true, updatedAt: true },
    });
  }

  /* ---------- Delete (soft) ---------- */
  async remove(eventId: string, departmentId: string, taskId: string, actor: Actor) {
    const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
    if (!task) throw new NotFoundException();

    if (role !== 'SUPER' && !canDeleteTask(role as EventRole, task, actor.userId, sameDept)) {
      throw new ForbiddenException('Cannot delete this task');
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  /* ---------- Dependencies ---------- */
  async listDependencies(eventId: string, departmentId: string, taskId: string, actor: Actor) {
    await this.getActorRole(eventId, departmentId, actor);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
    if (!task) throw new NotFoundException();
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

  async addDependency(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: AddDependencyDto) {
    const { role } = await this.getActorRole(eventId, departmentId, actor);
    if (role !== 'SUPER' && !(ADMIN_ROLES.has(role as EventRole) || (role as EventRole) === EventRole.DEPT_HEAD)) {
      throw new ForbiddenException('Insufficient role to link dependency');
    }
    const downstream = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
    if (!downstream) throw new NotFoundException('Task not found');
    const upstream = await this.prisma.task.findFirst({ where: { id: dto.upstreamId, eventId, deletedAt: null } });
    if (!upstream) throw new NotFoundException('Upstream task not found');
    if (upstream.id === downstream.id) throw new BadRequestException('Cannot depend on itself');

    await this.prisma.taskDependency.create({
      data: { upstreamId: upstream.id, downstreamId: downstream.id, depType: dto.depType as DependencyType },
    }).catch((e) => {
      if (String(e?.code) === 'P2002') return; // unique constraint -> ignore
      throw e;
    });
    return { ok: true };
  }

  async removeDependency(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: RemoveDependencyDto) {
    const { role } = await this.getActorRole(eventId, departmentId, actor);
    if (role !== 'SUPER' && !(ADMIN_ROLES.has(role as EventRole) || (role as EventRole) === EventRole.DEPT_HEAD)) {
      throw new ForbiddenException('Insufficient role to unlink dependency');
    }
    const downstream = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
    if (!downstream) throw new NotFoundException('Task not found');
    await this.prisma.taskDependency.deleteMany({ where: { upstreamId: dto.upstreamId, downstreamId: downstream.id } });
    return { ok: true };
  }
}
