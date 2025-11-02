import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { ChangeIssueStatusDto } from './dto/change-issue-status.dto';
import { ADMIN_ROLES, canDeleteIssue, canUpdateIssue } from '../common/rbac/rules';
import { EventRole } from '@prisma/client';

type Actor = { userId: string; isSuperAdmin: boolean };

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActorRole(eventId: string, departmentId: string, actor: Actor) {
    if (actor.isSuperAdmin) return { role: 'SUPER' as const, sameDept: true };
    const memberships = await this.prisma.eventMembership.findMany({
      where: { eventId, userId: actor.userId },
      select: { role: true, departmentId: true },
    });
    if (!memberships.length) throw new NotFoundException();
    const hasAdmin = memberships.some(m => ADMIN_ROLES.has(m.role));
    const sameDept = memberships.some(m => m.departmentId === departmentId);
    const topRole: EventRole = hasAdmin
      ? EventRole.PMO_ADMIN
      : (memberships.find(m => m.departmentId === departmentId)?.role ??
         memberships[0].role);
    return { role: topRole, sameDept };
  }

  async list(eventId: string, departmentId: string, actor: Actor, opts: { cursor?: string; take?: number } = {}) {
    await this.getActorRole(eventId, departmentId, actor);
    const take = Math.min(Math.max((opts.take ?? 20), 1), 100);
    const where = { eventId, departmentId, deletedAt: null as Date | null };
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

  async create(eventId: string, departmentId: string, actor: Actor, dto: CreateIssueDto) {
    const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
    // members in same dept, heads, or admins can create
    const canCreate = role === 'SUPER' || ADMIN_ROLES.has(role as EventRole) || (sameDept && (role as EventRole));
    if (!canCreate) throw new ForbiddenException('Insufficient role to create issue');

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

  async get(eventId: string, departmentId: string, issueId: string, actor: Actor) {
    await this.getActorRole(eventId, departmentId, actor);
    const issue = await this.prisma.issue.findFirst({ where: { id: issueId, eventId, departmentId, deletedAt: null } });
    if (!issue) throw new NotFoundException();
    return issue;
  }

  async update(eventId: string, departmentId: string, issueId: string, actor: Actor, dto: UpdateIssueDto) {
    const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
    const issue = await this.prisma.issue.findFirst({ where: { id: issueId, eventId, departmentId, deletedAt: null } });
    if (!issue) throw new NotFoundException();

    if (role !== 'SUPER' && !canUpdateIssue(role as EventRole, issue, actor.userId, sameDept)) {
      throw new ForbiddenException('Cannot update this issue');
    }

    return this.prisma.issue.update({
      where: { id: issue.id },
      data: { title: dto.title, description: dto.description, severity: dto.severity },
      select: { id: true, title: true, severity: true, status: true, updatedAt: true },
    });
  }

  async changeStatus(eventId: string, departmentId: string, issueId: string, actor: Actor, dto: ChangeIssueStatusDto) {
    const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
    const issue = await this.prisma.issue.findFirst({ where: { id: issueId, eventId, departmentId, deletedAt: null } });
    if (!issue) throw new NotFoundException();

    if (role !== 'SUPER' && !canUpdateIssue(role as EventRole, issue, actor.userId, sameDept)) {
      throw new ForbiddenException('Cannot update this issue');
    }

    const data: any = { status: dto.status };
    if (dto.status === 'closed') data.closedAt = new Date();

    return this.prisma.issue.update({
      where: { id: issue.id },
      data,
      select: { id: true, status: true, closedAt: true, updatedAt: true },
    });
  }

  async remove(eventId: string, departmentId: string, issueId: string, actor: Actor) {
    const { role, sameDept } = await this.getActorRole(eventId, departmentId, actor);
    const issue = await this.prisma.issue.findFirst({ where: { id: issueId, eventId, departmentId, deletedAt: null } });
    if (!issue) throw new NotFoundException();

    if (role !== 'SUPER' && !canDeleteIssue(role as EventRole, issue, actor.userId, sameDept)) {
      throw new ForbiddenException('Cannot delete this issue');
    }

    await this.prisma.issue.update({
      where: { id: issue.id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }
}
