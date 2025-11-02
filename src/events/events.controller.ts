import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventGuard } from '../common/guards/event.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { RequireEventRoles } from '../common/decorators/require-event-roles.decorator';
import { EventRole } from '@prisma/client';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class EventsController {
    constructor(private readonly events: EventsService) { }

    /* ------ Events (create/list global) ------ */

    @Post('events')
    createEvent(@CurrentUser() user: any, @Body() dto: CreateEventDto) {
        return this.events.create(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Get('events')
    listEvents(@CurrentUser() user: any) {
        return this.events.listForUser({ userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    /* ------ Event-scoped (guarded) ------ */

    @Get('events/:eventId')
    @UseGuards(EventGuard)
    getEvent(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.events.get(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Patch('events/:eventId')
    @UseGuards(EventGuard, RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    updateEvent(@Param('eventId') eventId: string, @Body() dto: UpdateEventDto, @CurrentUser() user: any) {
        return this.events.update(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Delete('events/:eventId')
    @UseGuards(EventGuard, RoleGuard)
    @RequireEventRoles(EventRole.OWNER)
    async deleteEvent(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.events.remove(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    /* ------ Membership management ------ */

    @Get('events/:eventId/members')
    @UseGuards(EventGuard)
    listMembers(@Param('eventId') eventId: string, @CurrentUser() user: any) {
        return this.events.listMembers(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Post('events/:eventId/members')
    @UseGuards(EventGuard, RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    addMember(@Param('eventId') eventId: string, @Body() dto: AddMemberDto, @CurrentUser() user: any) {
        return this.events.addMember(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Patch('events/:eventId/members/:userId')
    @UseGuards(EventGuard, RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    updateMember(
        @Param('eventId') eventId: string,
        @Param('userId') userId: string,
        @Body() dto: UpdateMemberDto,
        @CurrentUser() user: any,
    ) {
        return this.events.updateMember(eventId, userId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }

    @Delete('events/:eventId/members/:userId')
    @UseGuards(EventGuard, RoleGuard)
    @RequireEventRoles(EventRole.OWNER, EventRole.PMO_ADMIN)
    async removeMember(@Param('eventId') eventId: string, @Param('userId') userId: string, @CurrentUser() user: any) {
        return this.events.removeMember(eventId, userId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
}
