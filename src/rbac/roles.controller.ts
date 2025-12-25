import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto/role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
    constructor(private readonly rbacService: RbacService) { }

    @Get('modules')
    listModules() {
        return this.rbacService.listModules();
    }

    @Get()
    listRoles(@Req() req: any) {
        const tenantId = req.tenant?.id;
        if (!tenantId) throw new Error('Tenant context required');
        return this.rbacService.listRoles(tenantId);
    }

    @Post()
    createRole(@Req() req: any, @Body() dto: CreateRoleDto) {
        const tenantId = req.tenant?.id;
        if (!tenantId) throw new Error('Tenant context required');
        return this.rbacService.createRole(tenantId, dto);
    }

    @Get(':id')
    getRole(@Req() req: any, @Param('id') id: string) {
        const tenantId = req.tenant?.id;
        return this.rbacService.getRole(tenantId, id);
    }

    @Put(':id')
    updateRole(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRoleDto) {
        const tenantId = req.tenant?.id;
        return this.rbacService.updateRole(tenantId, id, dto);
    }

    @Delete(':id')
    deleteRole(@Req() req: any, @Param('id') id: string) {
        const tenantId = req.tenant?.id;
        return this.rbacService.deleteRole(tenantId, id);
    }

    @Post(':id/permissions')
    assignPermission(@Req() req: any, @Param('id') id: string, @Body() dto: AssignPermissionDto) {
        const tenantId = req.tenant?.id;
        return this.rbacService.assignPermissions(tenantId, id, dto);
    }
}
