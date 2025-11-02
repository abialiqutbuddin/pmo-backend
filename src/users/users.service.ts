import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, actor: { id: string; isSuperAdmin: boolean }) {
    // initial password is the ITS ID, as requested
    const passwordHash = await argon2.hash(dto.itsId);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        itsId: dto.itsId,
        profileImage: dto.profileImage,
        organization: dto.organization,
        designation: dto.designation,
        phoneNumber: dto.phoneNumber,
        passwordHash,
        isDisabled: actor.isSuperAdmin ? !!dto.isDisabled : false,
        // only super-admin can create super-admins
        isSuperAdmin: actor.isSuperAdmin ? !!dto.isSuperAdmin : false,
      },
      select: { id: true, email: true, fullName: true, isDisabled: true, isSuperAdmin: true, createdAt: true },
    });
  }

  async list(actor: { isSuperAdmin: boolean }) {
    if (!actor.isSuperAdmin) throw new ForbiddenException();
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        isDisabled: true,
        isSuperAdmin: true,
        createdAt: true,
        itsId: true,
        profileImage: true,
        organization: true,
        designation: true,
        phoneNumber: true,
      },
    });
  }

  async get(id: string, actor: { id: string; isSuperAdmin: boolean }) {
    if (!actor.isSuperAdmin && actor.id !== id) throw new ForbiddenException();
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isDisabled: true,
        isSuperAdmin: true,
        createdAt: true,
        itsId: true,
        profileImage: true,
        organization: true,
        designation: true,
        phoneNumber: true,
      },
    });
    if (!u) throw new NotFoundException();
    return u;
  }

  async update(id: string, dto: UpdateUserDto, actor: { id: string; isSuperAdmin: boolean }) {
    const isSelf = actor.id === id;

    // Only super-admin can change isSuperAdmin or isDisabled, or update others' accounts
    if (!actor.isSuperAdmin) {
      if (!isSelf) throw new ForbiddenException();
      // strip privileged fields
      delete dto.isSuperAdmin;
      delete dto.isDisabled;
    }

    let passwordHash: string | undefined;
    if (dto.password) passwordHash = await argon2.hash(dto.password);

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
        ...(actor.isSuperAdmin && dto.isDisabled !== undefined ? { isDisabled: !!dto.isDisabled } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isDisabled: true,
        isSuperAdmin: true,
        createdAt: true,
        itsId: true,
        profileImage: true,
        organization: true,
        designation: true,
        phoneNumber: true,
      },
    });
  }

  async delete(id: string, actor: { isSuperAdmin: boolean }) {
    if (!actor.isSuperAdmin) throw new ForbiddenException();
    await this.prisma.user.delete({ where: { id } });
  }
}
