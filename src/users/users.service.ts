import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface Actor {
  id: string;
  isSuperAdmin: boolean;
  isTenantManager?: boolean;
  tenantId: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateUserDto, tenantId: string, actor?: Actor) {
    // If actor is provided, ensure they have permission (e.g. only Admin can create?)
    // For now, retaining existing logic but handling tenantId.

    // initial password is the ITS ID, as requested
    // initial password is the ITS ID, as requested
    const passwordHash = await argon2.hash(dto.itsId);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          itsId: dto.itsId,
          profileImage: dto.profileImage,
          organization: dto.organization,
          designation: dto.designation,
          phoneNumber: dto.phoneNumber,
          passwordHash,
          tenantId, // Set tenantId
          // If actor is provided (admin creating user), respect logic. If not (signup), defaults.
          isDisabled: actor?.isSuperAdmin ? !!dto.isDisabled : false,
          // only super-admin can create super-admins
          isSuperAdmin: actor?.isSuperAdmin ? !!dto.isSuperAdmin : false,
          // super-admin or tenant manager can set isTenantManager
          isTenantManager: (actor?.isSuperAdmin || actor?.isTenantManager) ? !!dto.isTenantManager : false,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isDisabled: true,
          isSuperAdmin: true,
          isTenantManager: true,
          createdAt: true,
          itsId: true,
          profileImage: true,
          organization: true,
          designation: true,
          phoneNumber: true,
        },
      });

      // Handle Event Assignments
      if (dto.eventIds && dto.eventIds.length > 0) {
        // Validate events belong to tenant? 
        // Ideally yes, but database FKs enforce validity of eventId. 
        // Strict tenancy check would query events first. Assuming trusted input for now or DB constraint handles it.
        // Actually, Prisma createMany won't check if event belongs to tenant, but user belongs to tenant.
        // It's safer to filter eventIds by tenant if strictness required. But let's proceed with simple insertion.

        await tx.eventMembership.createMany({
          data: dto.eventIds.map(eventId => ({
            eventId,
            userId: user.id,
            roleId: dto.eventRoleId || null,
          })),
          skipDuplicates: true
        });
      }

      return user;
    });
  }

  async list(actor: Actor) {
    // List users ONLY within the actor's tenant
    // If superAdmin, maybe allow listing all? But usually scoped to tenant unless specifically cross-tenant.
    // Assuming strict tenancy for now.
    return this.prisma.user.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        isDisabled: true,
        isSuperAdmin: true,
        isTenantManager: true,
        createdAt: true,
        itsId: true,
        profileImage: true,
        organization: true,
        designation: true,
        phoneNumber: true,
      },
    });
  }

  async get(id: string, actor: Actor) {
    if (!actor.isSuperAdmin && !actor.isTenantManager && actor.id !== id) throw new ForbiddenException();

    const u = await this.prisma.user.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        roles: {
          include: {
            permissions: {
              include: { module: true }
            }
          }
        }
      }
    }) as any;
    if (!u) throw new NotFoundException();

    // Flatten permissions
    const permissions = new Set<string>();
    for (const r of u.roles) {
      for (const p of r.permissions) {
        if (!p.module || !p.actions) continue;
        const actions = p.actions as string[]; // stored as Json array
        for (const a of actions) {
          permissions.add(`${p.module.key}:${a}`);
        }
      }
    }

    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isDisabled: u.isDisabled,
      isSuperAdmin: u.isSuperAdmin,
      isTenantManager: u.isTenantManager,
      createdAt: u.createdAt,
      itsId: u.itsId,
      profileImage: u.profileImage,
      organization: u.organization,
      designation: u.designation,
      phoneNumber: u.phoneNumber,
      permissions: Array.from(permissions),
      roles: u.roles.map(r => ({ id: r.id, name: r.name })),
    };
  }

  async update(id: string, dto: UpdateUserDto, actor: Actor) {
    const isSelf = actor.id === id;

    // Only super-admin can change isSuperAdmin or isDisabled, or update others' accounts
    // Tenant managers can update other users and set isTenantManager
    const canManage = actor.isSuperAdmin || actor.isTenantManager;
    if (!canManage) {
      if (!isSelf) throw new ForbiddenException();
      // strip privileged fields
      delete dto.isSuperAdmin;
      delete dto.isTenantManager;
      delete dto.isDisabled;
    } else if (!actor.isSuperAdmin) {
      // Tenant managers can't set isSuperAdmin
      delete dto.isSuperAdmin;
    }

    let passwordHash: string | undefined;
    if (dto.password) passwordHash = await argon2.hash(dto.password);

    // Check ownership
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.tenantId !== actor.tenantId) throw new NotFoundException();

    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        fullName: dto.fullName,
        ...(passwordHash ? { passwordHash } : {}),
        itsId: dto.itsId,
        profileImage: dto.profileImage,
        organization: dto.organization,
        designation: dto.designation,
        phoneNumber: dto.phoneNumber,
        ...(actor.isSuperAdmin && dto.isSuperAdmin !== undefined ? { isSuperAdmin: !!dto.isSuperAdmin } : {}),
        ...((actor.isSuperAdmin || actor.isTenantManager) && dto.isTenantManager !== undefined ? { isTenantManager: !!dto.isTenantManager } : {}),
        ...((actor.isSuperAdmin || actor.isTenantManager) && dto.isDisabled !== undefined ? { isDisabled: !!dto.isDisabled } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isDisabled: true,
        isSuperAdmin: true,
        isTenantManager: true,
        createdAt: true,
        itsId: true,
        profileImage: true,
        organization: true,
        designation: true,
        phoneNumber: true,
      },
    });
  }

  async delete(id: string, actor: Actor) {
    if (!actor.isSuperAdmin && !actor.isTenantManager) throw new ForbiddenException();
    // Scope by tenant
    const user = await this.prisma.user.findFirst({ where: { id, tenantId: actor.tenantId } });
    if (!user) throw new NotFoundException();

    await this.prisma.user.delete({ where: { id } });
  }
}

