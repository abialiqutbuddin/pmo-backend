// src/departments/departments.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDeptMemberDto } from './dto/add-dept-member.dto';
import { UpdateDeptMemberDto } from './dto/update-dept-member.dto';
import { EventRole } from '@prisma/client';

@Injectable()
export class DepartmentsService {
    constructor(private readonly prisma: PrismaService) { }

    private static readonly ADMIN_ROLES = new Set<EventRole>([EventRole.OWNER, EventRole.PMO_ADMIN]);
    private static readonly DEPT_SCOPED = new Set<EventRole>([
        EventRole.DEPT_HEAD,
        EventRole.DEPT_MEMBER,
        EventRole.OBSERVER,
    ]);

    private async assertAdmin(eventId: string, userId: string, isSuperAdmin: boolean) {
        if (isSuperAdmin) return;
        const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!m) throw new NotFoundException();
        if (!DepartmentsService.ADMIN_ROLES.has(m.role)) throw new ForbiddenException('Insufficient role');
    }

    private async assertMember(eventId: string, userId: string, isSuperAdmin: boolean) {
        if (isSuperAdmin) return;
        const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!m) throw new NotFoundException();
    }

    /* -------- Departments CRUD -------- */

    async list(eventId: string, viewer: { userId: string; isSuperAdmin: boolean }) {
        await this.assertMember(eventId, viewer.userId, viewer.isSuperAdmin);
        return this.prisma.department.findMany({
            where: { eventId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
    }

    async create(eventId: string, dto: CreateDepartmentDto, actor: { userId: string; isSuperAdmin: boolean }) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        return this.prisma.department.create({
            data: { eventId, name: dto.name },
            select: { id: true, name: true },
        });
    }

    async update(eventId: string, departmentId: string, dto: UpdateDepartmentDto, actor: { userId: string; isSuperAdmin: boolean }) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId } });
        if (!d) throw new NotFoundException();
        return this.prisma.department.update({
            where: { id: departmentId },
            data: { name: dto.name },
            select: { id: true, name: true },
        });
    }

    async remove(eventId: string, departmentId: string, actor: { userId: string; isSuperAdmin: boolean }) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId } });
        if (!d) throw new NotFoundException();

        // Optionally: ensure no DEPT_HEAD remains before delete, or cascade memberships
        await this.prisma.$transaction(async (tx) => {
            await tx.eventMembership.deleteMany({ where: { eventId, departmentId } });
            await tx.department.delete({ where: { id: departmentId } });
        });

        return { ok: true };
    }

    /* -------- Department Members -------- */

    async listMembers(eventId: string, departmentId: string, viewer: { userId: string; isSuperAdmin: boolean }) {
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

    async addMember(eventId: string, departmentId: string, dto: AddDeptMemberDto, actor: { userId: string; isSuperAdmin: boolean }) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);

        if (!DepartmentsService.DEPT_SCOPED.has(dto.role)) {
            throw new BadRequestException('Role must be dept-scoped (DEPT_HEAD | DEPT_MEMBER | OBSERVER)');
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

    async updateMember(eventId: string, departmentId: string, userId: string, dto: UpdateDeptMemberDto, actor: { userId: string; isSuperAdmin: boolean }) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);

        if (!DepartmentsService.DEPT_SCOPED.has(dto.role)) {
            throw new BadRequestException('Role must be dept-scoped (DEPT_HEAD | DEPT_MEMBER | OBSERVER)');
        }

        const mem = await this.prisma.eventMembership.findFirst({ where: { eventId, departmentId, userId } });
        if (!mem) throw new NotFoundException();

        return this.prisma.eventMembership.update({
            where: { id: mem.id },
            data: { role: dto.role },
            select: { id: true, userId: true, role: true, departmentId: true },
        });
    }

    async removeMember(eventId: string, departmentId: string, userId: string, actor: { userId: string; isSuperAdmin: boolean }) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        await this.prisma.eventMembership.deleteMany({ where: { eventId, departmentId, userId } });
        return { ok: true };
    }

    // departments.service.ts
    async listAssignable(
        eventId: string,
        departmentId: string,
        viewer: { userId: string; isSuperAdmin: boolean },
        q?: string, // optional search by name/email
    ) {
        // must be at least a member to see
        await this.assertMember(eventId, viewer.userId, viewer.isSuperAdmin);

        // Fetch all event memberships with user info
        const memberships = await this.prisma.eventMembership.findMany({
            where: { eventId },
            select: {
                userId: true,
                departmentId: true,
                user: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Exclude users already in this department
        const alreadyInDept = new Set(
            memberships.filter(m => m.departmentId === departmentId).map(m => m.userId)
        );

        // Candidate pool: all event members not currently in this department
        const pool = memberships.filter(m => !alreadyInDept.has(m.userId));

        // Deduplicate by userId so each user appears once
        const byUser = new Map<string, { userId: string; fullName: string; email: string }>();
        for (const m of pool) {
            if (!byUser.has(m.userId)) {
                byUser.set(m.userId, { userId: m.user.id, fullName: m.user.fullName, email: m.user.email });
            }
        }

        let result = Array.from(byUser.values());
        if (q && q.trim()) {
            const term = q.trim().toLowerCase();
            result = result.filter(r =>
                (r.fullName || '').toLowerCase().includes(term) || (r.email || '').toLowerCase().includes(term)
            );
        }

        // Sort by name for nicer UX
        result.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        return result;
    }

    // departments.service.ts
    async bulkAddMembers(
        eventId: string,
        departmentId: string,
        items: { userId: string; role: 'DEPT_HEAD' | 'DEPT_MEMBER' | 'OBSERVER' }[],
        actor: { userId: string; isSuperAdmin: boolean },
    ) {
        await this.assertAdmin(eventId, actor.userId, actor.isSuperAdmin);
        if (!items.length) return { added: 0 };

        await this.prisma.$transaction(
            items.map(i =>
                this.prisma.eventMembership.upsert({
                    where: { eventId_userId_departmentId: { eventId, userId: i.userId, departmentId } },
                    update: { role: i.role },
                    create: { eventId, userId: i.userId, role: i.role, departmentId },
                }),
            ),
        );
        return { added: items.length };
    }

}
