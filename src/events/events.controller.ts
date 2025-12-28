import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventPermissionsService } from './event-permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
// import { EventGuard } from '../common/guards/event.guard';
// import { RoleGuard } from '../common/guards/role.guard';
// import { RequireEventRoles } from '../common/decorators/require-event-roles.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { RequirePermission } from '../common/guards/permissions.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(
        private readonly events: EventsService,
        private readonly eventPermissions: EventPermissionsService,
    ) { }

    /* ------ Events (create/list global) ------ */

    @Post('events')
    @RequirePermission('events', 'create')
    createEvent(@CurrentUser() user: any, @Body() dto: CreateEventDto) {
        return this.events.create(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin, tenantId: user.tenantId });
    }

    @Get('events')
    @RequirePermission('events', 'read')
    listEvents(@CurrentUser() user: any) {
        return this.events.listForUser({ userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    /* ------ Event-scoped (guarded) ------ */

    @Get('events/:eventId')
    // @UseGuards(EventGuard) // Revisit guards
    @RequirePermission('events', 'read')
    getEvent(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.events.get(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Patch('events/:eventId')
    // @UseGuards(EventGuard, RoleGuard)
    @RequirePermission('events', 'update')
    updateEvent(@Param('eventId') eventId: string, @Body() dto: UpdateEventDto, @CurrentUser() user: any) {
        return this.events.update(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Delete('events/:eventId')
    // @UseGuards(EventGuard, RoleGuard)
    @RequirePermission('events', 'delete')
    async deleteEvent(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.events.remove(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    /* ------ Membership management ------ */

    @Get('events/:eventId/members')
    // @UseGuards(EventGuard)
    @RequirePermission('events', 'assign_members') // Custom feature check
    listMembers(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.events.listMembers(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });
    }

    @Get('events/:eventId/my-memberships')
    getMyMemberships(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.events.listUserMemberships(eventId, user.sub);
    }



    @Post('events/:eventId/members')
    // @UseGuards(EventGuard, RoleGuard)
    @RequirePermission('events', 'assign_members')
    addMember(@Param('eventId') eventId: string, @Body() dto: AddMemberDto, @CurrentUser() user: any) {
        return this.events.addMember(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Get('events/:eventId/members/assignable')
    @RequirePermission('events', 'assign_members')
    listAssignableMembers(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.events.listAssignableUsers(eventId, user.tenantId);
    }

    @Post('events/:eventId/members/bulk')
    @RequirePermission('events', 'assign_members')
    bulkAddMembers(@Param('eventId') eventId: string, @Body() body: { userIds: string[], roleId?: string }, @CurrentUser() user: any) {
        return this.events.bulkAddMembers(eventId, body.userIds, body.roleId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Patch('events/:eventId/members/:userId')
    // @UseGuards(EventGuard, RoleGuard)
    @RequirePermission('events', 'assign_members')
    updateMember(
        @Param('eventId') eventId: string,
        @Param('userId') userId: string,
        @Body() dto: UpdateMemberDto,
        @CurrentUser() user: any,
    ) {
        return this.events.updateMember(eventId, userId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Delete('events/:eventId/members/:userId')
    // @UseGuards(EventGuard, RoleGuard)
    @RequirePermission('events', 'assign_members')
    async removeMember(
        @Param('eventId') eventId: string,
        @Param('userId') userId: string,
        @Query('departmentId') departmentId: string | undefined, // NEW
        @CurrentUser() user: any
    ) {
        return this.events.removeMember(eventId, userId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, departmentId);
    }

    /* ------ Event-scoped Permissions Management ------ */

    /**
     * Get all users with permissions in an event.
     */
    @Get('events/:eventId/permissions')
    @RequirePermission('events', 'manage_settings')
    listEventPermissions(@Param('eventId') eventId: string) {
        return this.eventPermissions.listEventPermissions(eventId);
    }

    /**
     * Get permissions for a specific user in an event.
     */
    @Get('events/:eventId/permissions/:userId')
    @RequirePermission('events', 'manage_settings')
    getUserPermissions(
        @Param('eventId') eventId: string,
        @Param('userId') userId: string,
    ) {
        return this.eventPermissions.getUserEventPermissions(eventId, userId);
    }

    /**
     * Get my permissions for the current event (for frontend to fetch).
     */
    @Get('events/:eventId/my-permissions')
    getMyPermissions(
        @Param('eventId') eventId: string,
        @CurrentUser() user: any,
    ) {
        return this.eventPermissions.getFlattenedPermissions(eventId, user.sub);
    }

    /**
     * Set all permissions for a user in an event (bulk update).
     * Body: { moduleId: actions[] }
     */
    @Put('events/:eventId/permissions/:userId')
    @RequirePermission('events', 'manage_settings')
    setUserPermissions(
        @Param('eventId') eventId: string,
        @Param('userId') userId: string,
        @Body() permissions: Record<string, string[]>,
    ) {
        return this.eventPermissions.setAllUserPermissions(eventId, userId, permissions);
    }

    /**
     * Set permission for a specific module for a user in an event.
     * Body: { actions: string[] }
     */
    @Put('events/:eventId/permissions/:userId/:moduleId')
    @RequirePermission('events', 'manage_settings')
    setUserModulePermission(
        @Param('eventId') eventId: string,
        @Param('userId') userId: string,
        @Param('moduleId') moduleId: string,
        @Body() body: { actions: string[] },
    ) {
        return this.eventPermissions.setUserModulePermission(eventId, userId, moduleId, body.actions);
    }

    /**
     * Copy permissions from one user to another.
     * Body: { fromUserId: string }
     */
    @Post('events/:eventId/permissions/:userId/copy')
    @RequirePermission('events', 'manage_settings')
    copyPermissions(
        @Param('eventId') eventId: string,
        @Param('userId') toUserId: string,
        @Body() body: { fromUserId: string },
    ) {
        return this.eventPermissions.copyUserPermissions(eventId, body.fromUserId, toUserId);
    }
}
