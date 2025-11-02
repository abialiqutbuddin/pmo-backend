// src/departments/departments.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventGuard } from '../common/guards/event.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { RequireEventRoles } from '../common/decorators/require-event-roles.decorator';
import { EventRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDeptMemberDto } from './dto/add-dept-member.dto';
import { UpdateDeptMemberDto } from './dto/update-dept-member.dto';

@Controller('events/:eventId/departments')
@UseGuards(JwtAuthGuard, EventGuard)
export class DepartmentsController {
    constructor(private readonly depts: DepartmentsService) { }

    // anyone in the event can list departments
    @Get()
    list(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.depts.list(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    // manage departments: OWNER/PMO_ADMIN
    @Post()
    @UseGuards(RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    create(@Param('eventId') eventId: string, @Body() dto: CreateDepartmentDto, @CurrentUser() user: any) {
        return this.depts.create(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Patch(':departmentId')
    @UseGuards(RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    update(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Body() dto: UpdateDepartmentDto,
        @CurrentUser() user: any,
    ) {
        return this.depts.update(eventId, departmentId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Delete(':departmentId')
    @UseGuards(RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    remove(@Param('eventId') eventId: string, @Param('departmentId') departmentId: string, @CurrentUser() user: any) {
        return this.depts.remove(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    /* ---- department members ---- */

    @Get(':departmentId/members')
    listMembers(@Param('eventId') eventId: string, @Param('departmentId') departmentId: string, @CurrentUser() user: any) {
        return this.depts.listMembers(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Post(':departmentId/members')
    @UseGuards(RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    addMember(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Body() dto: AddDeptMemberDto,
        @CurrentUser() user: any,
    ) {
        return this.depts.addMember(eventId, departmentId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Patch(':departmentId/members/:userId')
    @UseGuards(RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
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
    @UseGuards(RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    removeMember(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Param('userId') userId: string,
        @CurrentUser() user: any,
    ) {
        return this.depts.removeMember(eventId, departmentId, userId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @UseGuards(JwtAuthGuard, EventGuard)
    @Get(':departmentId/assignable')
    listAssignable(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Query('q') q: string | undefined,
        @CurrentUser() user: any,
    ) {
        return this.depts.listAssignable(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, q);
    }

    @UseGuards(JwtAuthGuard, EventGuard, RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    @Post(':departmentId/members:bulk')
    bulkAdd(
        @Param('eventId') eventId: string,
        @Param('departmentId') departmentId: string,
        @Body() body: { items: { userId: string; role: 'DEPT_HEAD' | 'DEPT_MEMBER' | 'OBSERVER' }[] },
        @CurrentUser() user: any,
    ) {
        return this.depts.bulkAddMembers(eventId, departmentId, body.items ?? [], { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

}
