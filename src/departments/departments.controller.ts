// src/departments/departments.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { EventGuard } from '../common/guards/event.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDeptMemberDto } from './dto/add-dept-member.dto';
import { UpdateDeptMemberDto } from './dto/update-dept-member.dto';

@Controller('events/:eventId/departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
    constructor(private readonly depts: DepartmentsService) { }

    // anyone in the event can list departments -> 'read' permission on 'events' implies access? 
    // Or just membership. Let's start with event read permission.
    @Get()
    @RequirePermission('events', 'read')
    list(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.depts.list(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });
    }

    // manage departments: uses 'departments' module permissions
    @Post()
    @RequirePermission('departments', 'create')
    create(@Param('eventId') eventId: string, @Body() dto: CreateDepartmentDto, @CurrentUser() user: any) {
        return this.depts.create(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Patch(':departmentId')
    @RequirePermission('departments', 'update')
    update(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Body() dto: UpdateDepartmentDto,
        @CurrentUser() user: any,
    ) {
        return this.depts.update(eventId, departmentId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Delete(':departmentId')
    @RequirePermission('departments', 'delete')
    remove(@Param('eventId') eventId: string, @Param('departmentId') departmentId: string, @CurrentUser() user: any) {
        return this.depts.remove(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    /* ---- department members ---- */

    @Get(':departmentId/members')
    @RequirePermission('events', 'read')
    listMembers(@Param('eventId') eventId: string, @Param('departmentId') departmentId: string, @CurrentUser() user: any) {
        return this.depts.listMembers(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });
    }

    @Post(':departmentId/members')
    @RequirePermission('departments', 'manage_members')
    addMember(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Body() dto: AddDeptMemberDto,
        @CurrentUser() user: any,
    ) {
        return this.depts.addMember(eventId, departmentId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Patch(':departmentId/members/:userId')
    @RequirePermission('departments', 'manage_members')
    updateMember(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Param('userId') userId: string,
        @Body() dto: UpdateDeptMemberDto,
        @CurrentUser() user: any,
    ) {
        return this.depts.updateMember(eventId, departmentId, userId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Delete(':departmentId/members/:userId')
    @RequirePermission('departments', 'manage_members')
    removeMember(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Param('userId') userId: string,
        @CurrentUser() user: any,
    ) {
        return this.depts.removeMember(eventId, departmentId, userId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Get(':departmentId/assignable')
    @RequirePermission('events', 'read')
    listAssignable(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Query('q') q: string | undefined,
        @CurrentUser() user: any,
    ) {
        return this.depts.listAssignable(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager }, q);
    }

    @Post(':departmentId/members:bulk')
    @RequirePermission('departments', 'manage_members')
    bulkAdd(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Body() body: { items: { userId: string; role?: string }[] },
        @CurrentUser() user: any,
    ) {
        return this.depts.bulkAddMembers(eventId, departmentId, body.items ?? [], { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

}
