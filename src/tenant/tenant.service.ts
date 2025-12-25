import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import * as argon2 from 'argon2';

@Injectable()
export class TenantService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateTenantDto) {
        const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
        if (existing) throw new BadRequestException('Tenant slug already taken');

        return this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: dto.name,
                    slug: dto.slug,
                },
            });

            const passwordHash = await argon2.hash(dto.adminPassword);

            const user = await tx.user.create({
                data: {
                    email: dto.adminEmail,
                    fullName: dto.adminName,
                    tenantId: tenant.id,
                    passwordHash,
                    isSuperAdmin: false,
                    isTenantManager: true,
                },
            });

            // Create 'Admin' Role
            const role = await tx.role.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Tenant Manager',
                    description: 'Full access',
                }
            });

            // Assign all permissions
            const mods = await tx.module.findMany();
            if (mods.length) {
                await tx.permission.createMany({
                    data: mods.map(m => ({
                        roleId: role.id,
                        moduleId: m.id,
                        actions: m.features as any
                    }))
                });
            }

            // Assign role to user
            await tx.user.update({
                where: { id: user.id },
                data: { roles: { connect: { id: role.id } } }
            });

            return { tenant, user };
        });
    }

    async findAll() {
        return this.prisma.tenant.findMany({
        });
    }

    async delete(id: string) {
        // Due to CASCADE relations in schema, deleting tenant deletes all:
        // - Roles
        // - Users
        // - Events (and their Tasks, Depts via Event-level cascade)
        return this.prisma.tenant.delete({
            where: { id }
        });
    }
}
