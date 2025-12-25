import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto/role.dto';
import { ChatPermissionsHelper } from '../chat/chat-permissions.helper';

@Injectable()
export class RbacService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => ChatPermissionsHelper)) private readonly chatPerms: ChatPermissionsHelper,
    ) { }

    async createRole(tenantId: string, dto: CreateRoleDto) {
        const existing = await this.prisma.role.findFirst({
            where: { tenantId, name: dto.name },
        });
        if (existing) throw new BadRequestException('Role name already exists in this tenant');

        return this.prisma.role.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
                scope: dto.scope,
            },
        });
    }

    async listRoles(tenantId: string) {
        return this.prisma.role.findMany({
            where: { tenantId },
            include: {
                permissions: {
                    include: { module: true },
                },
                _count: { select: { users: true } },
            },
        });
    }

    async getRole(tenantId: string, roleId: string) {
        const role = await this.prisma.role.findFirst({
            where: { id: roleId, tenantId },
            include: {
                permissions: {
                    include: { module: true },
                },
            },
        });
        if (!role) throw new NotFoundException('Role not found');
        return role;
    }

    async updateRole(tenantId: string, roleId: string, dto: UpdateRoleDto) {
        const existingRole = await this.getRole(tenantId, roleId);

        // Track if chat:read permission changed
        const oldChatPerm = existingRole.permissions.find(p => p.module?.key === 'chat');
        const oldHadRead = oldChatPerm ? (oldChatPerm.actions as string[])?.includes('read') : false;

        const updatedRole = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.role.update({
                where: { id: roleId },
                data: {
                    name: dto.name,
                    description: dto.description,
                    scope: dto.scope,
                },
            });

            if (dto.permissions) {
                // Delete existing permissions
                await tx.permission.deleteMany({ where: { roleId } });

                // Create new permissions
                for (const p of dto.permissions) {
                    if (p.actions.length > 0) { // Only create if actions exist
                        await tx.permission.create({
                            data: {
                                roleId,
                                moduleId: p.moduleId,
                                actions: p.actions,
                            },
                        });
                    }
                }
            }

            return updated;
        });

        // Check if chat:read permission changed and sync users
        if (dto.permissions) {
            const chatModule = await this.prisma.module.findFirst({ where: { key: 'chat' } });
            const newChatPerm = dto.permissions.find(p => p.moduleId === chatModule?.id);
            const newHasRead = newChatPerm ? newChatPerm.actions.includes('read') : false;
            const isGlobalScope = updatedRole.scope === 'EVENT' || updatedRole.scope === 'BOTH';

            if (isGlobalScope && oldHadRead !== newHasRead) {
                await this.syncAllUsersWithRole(roleId, newHasRead);
            }
        }

        return updatedRole;
    }

    async deleteRole(tenantId: string, roleId: string) {
        const role = await this.getRole(tenantId, roleId);
        if (role.isSystem) throw new BadRequestException('Cannot delete system role');
        return this.prisma.role.delete({ where: { id: roleId } });
    }

    async assignPermissions(tenantId: string, roleId: string, dto: AssignPermissionDto) {
        const role = await this.getRole(tenantId, roleId);

        // Check if module exists (global)
        const module = await this.prisma.module.findUnique({ where: { id: dto.moduleId } });
        if (!module) throw new NotFoundException('Module not found');

        // Validate that actions exist in module features
        const validFeatures = (module.features as string[]) || [];
        const invalid = dto.actions.filter(a => !validFeatures.includes(a));
        if (invalid.length > 0) {
            throw new BadRequestException(`Invalid actions for module ${module.name}: ${invalid.join(', ')}`);
        }

        // Track old permissions for chat
        const oldPerm = role.permissions.find(p => p.moduleId === dto.moduleId);
        const oldHadRead = module.key === 'chat' && oldPerm ? (oldPerm.actions as string[])?.includes('read') : false;

        // Upsert permission
        const result = await this.prisma.permission.upsert({
            where: {
                roleId_moduleId: {
                    roleId,
                    moduleId: dto.moduleId,
                },
            },
            update: { actions: dto.actions }, // Overwrite actions
            create: {
                roleId,
                moduleId: dto.moduleId,
                actions: dto.actions,
            },
        });

        // Sync chat participants if chat:read permission changed
        if (module.key === 'chat') {
            const newHasRead = dto.actions.includes('read');
            const isGlobalScope = role.scope === 'EVENT' || role.scope === 'BOTH';

            if (isGlobalScope && oldHadRead !== newHasRead) {
                await this.syncAllUsersWithRole(roleId, newHasRead);
            }
        }

        return result;
    }

    async listModules() {
        return this.prisma.module.findMany({
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Sync all users with this role to/from system groups based on chat:read permission.
     */
    private async syncAllUsersWithRole(roleId: string, hasRead: boolean) {
        // Find all event memberships with this role
        const memberships = await this.prisma.eventMembership.findMany({
            where: { roleId },
            select: { eventId: true, userId: true },
        });

        for (const mem of memberships) {
            if (hasRead) {
                await this.chatPerms.addUserToAllSystemGroups(mem.eventId, mem.userId);
            } else {
                await this.chatPerms.removeUserFromNonDepartmentSystemGroups(mem.eventId, mem.userId);
            }
        }
    }
}

