// src/tasks/task-comments.controller.ts
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TaskCommentsService } from './task-comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// DTO class for NestJS decorator metadata
class CreateCommentDto {
    content: string;
    mentionedUserIds?: string[];
}

@Controller('events/:eventId/tasks/:taskId/comments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskCommentsController {
    constructor(private readonly commentsService: TaskCommentsService) { }

    @Get()
    @RequirePermission('tasks', 'read')
    list(@Param('taskId') taskId: string) {
        return this.commentsService.list(taskId);
    }

    @Post()
    @RequirePermission('tasks', 'update')
    create(
        @Param('taskId') taskId: string,
        @Body() dto: CreateCommentDto,
        @CurrentUser() user: any,
    ) {
        return this.commentsService.create(taskId, user.sub, dto);
    }

    @Delete(':commentId')
    @RequirePermission('tasks', 'update')
    delete(
        @Param('commentId') commentId: string,
        @CurrentUser() user: any,
    ) {
        return this.commentsService.delete(commentId, user.sub, user.isSuperAdmin);
    }
}
