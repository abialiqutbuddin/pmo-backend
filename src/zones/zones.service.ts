import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  list(eventId: string) {
    return this.prisma.zone.findMany({ where: { eventId }, orderBy: { name: 'asc' }, select: { id: true, name: true, enabled: true } });
  }

  async create(eventId: string, dto: CreateZoneDto) {
    // create zone and attach all existing zonal department templates for this event
    return this.prisma.$transaction(async (tx) => {
      const z = await tx.zone.create({ data: { eventId, name: dto.name.trim(), enabled: dto.enabled ?? true }, select: { id: true, name: true, enabled: true } });
      const templates = await tx.zonalDepartmentTemplate.findMany({ where: { eventId }, select: { id: true } });
      if (templates.length) {
        await tx.zoneZonalDepartment.createMany({ data: templates.map(t => ({ zoneId: z.id, zdeptId: t.id })), skipDuplicates: true });
      }
      return z;
    });
  }

  async update(eventId: string, zoneId: string, data: { name?: string; enabled?: boolean }) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    const payload: any = {};
    if (typeof data.name === 'string') payload.name = data.name.trim();
    if (typeof data.enabled === 'boolean') payload.enabled = data.enabled;
    return this.prisma.zone.update({ where: { id: zoneId }, data: payload, select: { id: true, name: true, enabled: true } });
  }

  async setZonesEnabled(eventId: string, enabled: boolean) {
    await this.prisma.event.update({ where: { id: eventId }, data: { zonesEnabled: enabled } });
    return { ok: true };
  }

  async listZoneDepartments(eventId: string, zoneId: string) {
    // verify zone belongs to event
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) return [];
    const rows = await this.prisma.zoneDepartment.findMany({ where: { zoneId }, select: { departmentId: true } });
    return rows.map(r => r.departmentId);
  }

  // Zonal department templates: list + create (auto-assign to all zones)
  async listZonalTemplates(eventId: string) {
    return this.prisma.zonalDepartmentTemplate.findMany({ where: { eventId }, orderBy: { name: 'asc' }, select: { id: true, name: true } });
  }

  async createZonalTemplate(eventId: string, name: string) {
    const trimmed = name.trim();
    return this.prisma.$transaction(async (tx) => {
      // Idempotent: if the template already exists for this event, reuse it
      const t = await tx.zonalDepartmentTemplate.upsert({
        where: { eventId_name: { eventId, name: trimmed } },
        update: {},
        create: { eventId, name: trimmed },
        select: { id: true, name: true },
      });
      // Ensure it is attached to all zones (skip duplicates if already mapped)
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

  async updateZonalTemplate(eventId: string, id: string, name: string) {
    const t = await this.prisma.zonalDepartmentTemplate.findFirst({ where: { id, eventId }, select: { id: true } });
    if (!t) throw new Error('Zonal department not found');
    const trimmed = name.trim();
    // Prevent duplicate name per event
    const dup = await this.prisma.zonalDepartmentTemplate.findFirst({ where: { eventId, name: trimmed, NOT: { id } }, select: { id: true } });
    if (dup) throw new Error('Name already exists');
    return this.prisma.zonalDepartmentTemplate.update({ where: { id }, data: { name: trimmed }, select: { id: true, name: true } });
  }

  async removeZonalTemplate(eventId: string, id: string) {
    const t = await this.prisma.zonalDepartmentTemplate.findFirst({ where: { id, eventId }, select: { id: true } });
    if (!t) throw new Error('Zonal department not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.zoneZonalDepartment.deleteMany({ where: { zdeptId: id } });
      await tx.zonalDepartmentTemplate.delete({ where: { id } });
      return { ok: true };
    });
  }

  // List zonal departments mapped within a specific zone (mapping id + name)
  async listZoneZonalDepts(eventId: string, zoneId: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) return [];
    const rows = await this.prisma.zoneZonalDepartment.findMany({
      where: { zoneId },
      include: { zdept: { select: { id: true, name: true } } },
    });
    // sort in memory by name for DB compatibility
    rows.sort((a, b) => (a.zdept?.name || '').localeCompare(b.zdept?.name || ''));
    return rows.map((r) => ({ id: r.id, name: r.zdept?.name || '', templateId: r.zdeptId }));
  }

  async setZoneDepartments(eventId: string, zoneId: string, departmentIds: string[]) {
    // verify zone belongs to event and departments belong to event
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
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

  // ---------- Zone POC assignments ----------
  async listPOCs(eventId: string, zoneId: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) return [];
    return this.prisma.zoneAssignment.findMany({
      where: { zoneId, role: 'POC' },
      select: { userId: true, role: true, user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { user: { fullName: 'asc' } },
    });
  }

  async addPOC(eventId: string, zoneId: string, userId: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    // ensure user exists
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) throw new Error('User not found');
    // upsert assignment (unique by zoneId,userId)
    await this.prisma.zoneAssignment.upsert({
      where: { zoneId_userId: { zoneId, userId } },
      update: { role: 'POC' },
      create: { zoneId, userId, role: 'POC' },
    });
    return { ok: true };
  }

  async removePOC(eventId: string, zoneId: string, userId: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    await this.prisma.zoneAssignment.delete({ where: { zoneId_userId: { zoneId, userId } } }).catch(() => {});
    return { ok: true };
  }

  // ---------- Zone-department members (heads/members within a zone) ----------
  async listZoneDeptMembers(eventId: string, zoneId: string, departmentId: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) return [];
    const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId }, select: { id: true } });
    if (!d) return [];
    return this.prisma.zoneDeptAssignment.findMany({
      where: { zoneId, departmentId },
      select: { userId: true, role: true, user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { user: { fullName: 'asc' } },
    });
  }

  async addZoneDeptMember(eventId: string, zoneId: string, departmentId: string, userId: string, role: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    const d = await this.prisma.department.findFirst({ where: { id: departmentId, eventId }, select: { id: true } });
    if (!d) throw new Error('Department not found');
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) throw new Error('User not found');
    await this.prisma.zoneDeptAssignment.upsert({
      where: { zoneId_departmentId_userId: { zoneId, departmentId, userId } },
      update: { role },
      create: { zoneId, departmentId, userId, role },
    });
    return { ok: true };
  }

  async updateZoneDeptMember(eventId: string, zoneId: string, departmentId: string, userId: string, role: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    await this.prisma.zoneDeptAssignment.update({
      where: { zoneId_departmentId_userId: { zoneId, departmentId, userId } },
      data: { role },
    });
    return { ok: true };
  }

  async removeZoneDeptMember(eventId: string, zoneId: string, departmentId: string, userId: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    await this.prisma.zoneDeptAssignment.delete({ where: { zoneId_departmentId_userId: { zoneId, departmentId, userId } } }).catch(() => {});
    return { ok: true };
  }

  // ---------- Generic zone assignments (HEAD/POC/MEMBER) ----------
  async listAssignments(eventId: string, zoneId: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) return [];
    return this.prisma.zoneAssignment.findMany({
      where: { zoneId },
      select: { userId: true, role: true, user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { user: { fullName: 'asc' } },
    });
  }

  async addAssignment(eventId: string, zoneId: string, userId: string, role: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) throw new Error('User not found');
    await this.prisma.zoneAssignment.upsert({
      where: { zoneId_userId: { zoneId, userId } },
      update: { role },
      create: { zoneId, userId, role },
    });
    return { ok: true };
  }

  async updateAssignment(eventId: string, zoneId: string, userId: string, role: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    await this.prisma.zoneAssignment.update({ where: { zoneId_userId: { zoneId, userId } }, data: { role } });
    return { ok: true };
  }

  async removeAssignment(eventId: string, zoneId: string, userId: string) {
    const z = await this.prisma.zone.findFirst({ where: { id: zoneId, eventId }, select: { id: true } });
    if (!z) throw new Error('Zone not found');
    await this.prisma.zoneAssignment.delete({ where: { zoneId_userId: { zoneId, userId } } }).catch(() => {});
    return { ok: true };
  }
}
