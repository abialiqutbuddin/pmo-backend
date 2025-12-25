import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { MailerService } from '../mail/mailer.service';
import { DependencyType, TaskStatus } from '@prisma/client';
import { AddDependencyDto } from './dto/dependencies/add-dependency.dto';
import { RemoveDependencyDto } from './dto/dependencies/remove-dependency.dto';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

type Actor = { userId: string; isSuperAdmin: boolean; isTenantManager: boolean };

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly eventsService: EventsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) { }

  // Helper to ensure basic access if needed, or rely on Controllers
  private async checkEventAccess(eventId: string, userId: string) {
    // Basic check replaced by scope check in list, but kept for other methods
    const mem = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
    if (!mem) throw new NotFoundException('Event not found or access denied');
    return mem;
  }

  /* ---------- List (with pagination) ---------- */
  async list(
    eventId: string,
    departmentId: string | undefined, // Valid to be undefined/null
    actor: Actor,
    opts: { cursor?: string; take?: number; assigneeId?: string; zoneId?: string; zonalDeptRowId?: string } = {},
  ) {
    // 1. Determine Scope
    const scope = await this.eventsService.getAccessibleScope(eventId, actor.userId, actor.isSuperAdmin, actor.isTenantManager);

    // 2. Build Where Clause
    const where: any = { eventId, deletedAt: null as Date | null };

    if (!scope.all) {
      if (!scope.departmentIds.length) return []; // No access to any department

      if (!scope.departmentIds.length) return []; // No access to any department

      if (departmentId) {
        // User requested specific dept. Check if allowed.
        if (!scope.departmentIds.includes(departmentId)) return [];
        where.departmentId = departmentId;
      } else {
        // User requested "all", but is restricted to specific depts
        where.departmentId = { in: scope.departmentIds };
      }
    } else {
      // Full access. Respect filter if provided.
      if (departmentId) where.departmentId = departmentId;
    }

    const take = Math.min(Math.max(opts.take ?? 20, 1), 100);

    if (opts.zoneId) where.zoneId = opts.zoneId;
    if (opts.zonalDeptRowId) where.zonalDeptRowId = opts.zonalDeptRowId;
    if (opts.assigneeId) where.assigneeId = opts.assigneeId;

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
  async searchEventTasks(eventId: string, query: string, limit = 20) {
    if (!query?.trim()) return [];
    return this.prisma.task.findMany({
      where: {
        eventId,
        deletedAt: null,
        title: { contains: query.trim() },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        assignee: { select: { id: true, fullName: true, profileImage: true } },
      },
    });
  }

  async create(eventId: string, departmentId: string, actor: Actor, dto: CreateTaskDto) {
    const data: any = {
      eventId,
      departmentId,
      creatorId: actor.userId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || 3,
      status: dto.status || TaskStatus.todo,
      type: dto.type,
      startAt: dto.startAt ? new Date(dto.startAt) : null,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      assigneeId: dto.assigneeId,
      venueId: dto.venueId,
      zoneId: dto.zoneId,
      zonalDeptRowId: dto.zonalDeptRowId,
    };

    const task = await this.prisma.task.create({ data });

    // 🔍 AUDIT LOG
    this.auditService.log(
      actor.userId,
      eventId,
      'TASK_CREATED',
      'Task',
      task.id,
      { title: task.title, status: task.status },
      `Created task "${task.title}"`
    );

    // Notify assignee if generic task
    if (task.assigneeId && task.assigneeId !== actor.userId) {
      // ... logic to send notification ...
      // We can use a unified notifications service later
    }

    // Notify assignee (if any) in background
    if (task.assigneeId) {
      // Enqueue email job
      const [assignee, dept, ev, actorUser] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: task.assigneeId! }, select: { email: true, fullName: true } }),
        this.prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } }),
        this.prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }),
        this.prisma.user.findUnique({ where: { id: actor.userId }, select: { fullName: true } }),
      ]);

      if (assignee && dept && ev && assignee.email) {
        this.mailer.sendTaskAssignedEmail({
          to: assignee.email,
          assigneeName: assignee.fullName || undefined,
          taskTitle: task.title,
          actorName: actorUser?.fullName || 'Someone',
          departmentName: dept.name,
          eventName: ev.name,
        });

        // In-app notification
        try {
          await this.notificationsService.create({
            userId: task.assigneeId!,
            eventId,
            kind: 'TASK_ASSIGNED',
            title: 'Task Assigned',
            body: `You were assigned to "${task.title}"`,
            link: `/events/${eventId}/tasks/${task.id}`,
          });
        } catch (e: any) {
          this.logger.warn(`In-app notification (create assign) failed: ${e?.message || e}`);
        }
      }
    }

    return task;
  }

  /* ---------- Get ---------- */
  async get(eventId: string, departmentId: string, taskId: string, actor: Actor) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, eventId, departmentId, deletedAt: null },
    });
    if (!task) throw new NotFoundException();
    return task;
  }

  /* ---------- Update ---------- */
  async update(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
    if (!task) throw new NotFoundException();

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

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data,
      select: { id: true, title: true, status: true, priority: true, assigneeId: true, updatedAt: true },
    });

    // 🔍 AUDIT LOG
    this.auditService.log(
      actor.userId,
      eventId,
      'TASK_UPDATED',
      'Task',
      task.id,
      data, // Log the changes
      `Updated task details`
    );

    // Notifications...
    const nextAssignee = data.assigneeId === undefined ? task.assigneeId : data.assigneeId;
    if (nextAssignee && nextAssignee !== task.assigneeId) {
      const [assignee, dept, ev] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: nextAssignee! }, select: { email: true, fullName: true } }),
        this.prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } }),
        this.prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }),
      ]);
      if (assignee?.email) {
        setImmediate(async () => {
          try {
            await this.mailer.sendTaskAssignedEmail({
              to: assignee.email,
              assigneeName: assignee.fullName || undefined,
              taskTitle: updated.title,
              departmentName: dept?.name,
              eventName: ev?.name,
              actorName: 'Someone', // TODO: Fetch actor name
            });
          } catch (e: any) {
            this.logger.warn(`Email notify (update) failed: ${e?.message || e}`);
          }
        });

        // In-app notification
        try {
          await this.notificationsService.create({
            userId: nextAssignee!,
            eventId,
            kind: 'TASK_ASSIGNED',
            title: 'Task Assigned',
            body: `You were assigned to "${updated.title}"`,
            link: `/events/${eventId}/tasks/${taskId}`,
          });
        } catch (e: any) {
          this.logger.warn(`In-app notification (update assign) failed: ${e?.message || e}`);
        }
      }
    }
    return updated;
  }

  /* ---------- Change Status ---------- */
  async changeStatus(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: ChangeTaskStatusDto) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
    if (!task) throw new NotFoundException();

    // Check blocking dependencies if status is changing to 'done' (or any terminal state if we had more)
    // Assuming 'done' is the only completed state for now.
    if (dto.status === 'done') {
      const blockers = await this.prisma.taskDependency.count({
        where: {
          blockedId: taskId,
          blocker: { status: { not: 'done' } } // Count blockers that are NOT done
        }
      });
      if (blockers > 0) {
        throw new ForbiddenException(`Cannot complete task. It is blocked by ${blockers} incomplete task(s).`);
      }
    }

    const data: any = { status: dto.status };
    if (typeof dto.progressPct === 'number') {
      if (dto.progressPct < 0 || dto.progressPct > 100) throw new BadRequestException('progressPct 0..100');
      data.progressPct = dto.progressPct;
    }
    if (dto.status === TaskStatus.done) data.completedAt = new Date();

    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data,
      select: { id: true, status: true, progressPct: true, completedAt: true, updatedAt: true },
    });

    // 🔍 AUDIT LOG
    this.auditService.log(
      actor.userId,
      eventId,
      'TASK_UPDATED',
      'Task',
      task.id,
      { status: dto.status, oldStatus: task.status },
      `Changed status to ${dto.status}`
    );

    return updated;
  }

  /* ---------- Delete (soft) ---------- */
  async remove(eventId: string, departmentId: string, taskId: string, actor: Actor) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId, deletedAt: null } });
    if (!task) throw new NotFoundException();

    await this.prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });

    // 🔍 AUDIT LOG
    this.auditService.log(
      actor.userId,
      eventId,
      'TASK_DELETED',
      'Task',
      task.id,
      undefined,
      `Deleted task "${task.title}"`
    );

    return { ok: true };
  }

  async getActivity(eventId: string, departmentId: string, taskId: string, actor: Actor) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, departmentId } }); // Allow viewing history even if soft deleted? maybe not.
    if (!task) throw new NotFoundException();

    return this.auditService.getHistory('Task', taskId);
  }

  /* ---------- Dependencies ---------- */
  async listDependencies(eventId: string, departmentId: string, taskId: string, actor: Actor) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
    if (!task) throw new NotFoundException();

    // We assume if you can see the task, you can see deps
    // blockedId = this task (downstream/blocked)
    const blockers = await this.prisma.taskDependency.findMany({
      where: { blockedId: task.id },
      include: { blocker: { select: { id: true, title: true, status: true, priority: true, dueAt: true, department: { select: { id: true, name: true } } } } },
    });
    // blockerId = this task (upstream/blocker)
    const dependents = await this.prisma.taskDependency.findMany({
      where: { blockerId: task.id },
      include: { blocked: { select: { id: true, title: true, status: true, priority: true, dueAt: true, department: { select: { id: true, name: true } } } } },
    });
    return {
      blockers: blockers.map((d) => ({ blockerId: d.blockerId, task: d.blocker })),
      dependents: dependents.map((d) => ({ blockedId: d.blockedId, task: d.blocked })),
    };
  }

  async addDependency(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: AddDependencyDto) {
    // Current task is the one getting BLOCKED (downstream)
    const blocked = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
    if (!blocked) throw new NotFoundException('Task not found');

    // The task that BLOCKS (upstream)
    const blocker = await this.prisma.task.findFirst({ where: { id: dto.blockerId, eventId, deletedAt: null } });
    if (!blocker) throw new NotFoundException('Blocker task not found');

    if (blocker.id === blocked.id) throw new BadRequestException('Cannot depend on itself');

    await this.prisma.taskDependency.create({
      data: { blockerId: blocker.id, blockedId: blocked.id },
    }).catch((e) => {
      if (String(e?.code) === 'P2002') return; // unique constraint -> ignore
      throw e;
    });
    return { ok: true };
  }

  async removeDependency(eventId: string, departmentId: string, taskId: string, actor: Actor, dto: RemoveDependencyDto) {
    const blocked = await this.prisma.task.findFirst({ where: { id: taskId, eventId, deletedAt: null } });
    if (!blocked) throw new NotFoundException('Task not found');

    await this.prisma.taskDependency.deleteMany({ where: { blockerId: dto.blockerId, blockedId: blocked.id } });
    return { ok: true };
  }

  async searchTasks(eventId: string, query: string, targetDepartmentId?: string) {
    // Helper to search tasks for dependency linking
    // Must be in same event.
    return this.prisma.task.findMany({
      where: {
        eventId,
        deletedAt: null,
        departmentId: targetDepartmentId || undefined,
        title: { contains: query }, // Default case-insensitive in MySQL usually? 
        // If not, use mode: 'insensitive' if Prisma allows (standard in Postgres, mixed in MySQL)
      },
      take: 20,
      select: { id: true, title: true, status: true, department: { select: { id: true, name: true } } }
    });
  }
}
