// src/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async list(
        @CurrentUser() user: any,
        @Query('eventId') eventId?: string,
    ) {
        return this.notificationsService.listForUser(user.sub, eventId);
    }

    @Get('unread-count')
    async unreadCount(
        @CurrentUser() user: any,
        @Query('eventId') eventId?: string,
    ) {
        const count = await this.notificationsService.getUnreadCount(user.sub, eventId);
        return { count };
    }

    @Patch(':id/read')
    async markAsRead(
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.notificationsService.markAsRead(id, user.sub);
    }

    @Patch('read-all')
    async markAllAsRead(
        @CurrentUser() user: any,
        @Query('eventId') eventId?: string,
    ) {
        await this.notificationsService.markAllAsRead(user.sub, eventId);
        return { ok: true };
    }
}
