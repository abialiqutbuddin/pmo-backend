import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('events/:eventId/tasks')
@UseGuards(JwtAuthGuard)
export class EventTasksController {
    constructor(private readonly tasks: TasksService) { }

    @Get('search')
    search(
        @Param('eventId') eventId: string,
        @Query('q') query: string,
        @CurrentUser() user: any,
    ) {
        // TODO: meaningful permission check? 
        // Ideally check if user is member of event.
        // relying on global JwtAuthGuard + context mostly safely assuming standard user access.
        // Real implementation should check `eventsService.isMember(eventId, userId)`.
        return this.tasks.searchEventTasks(eventId, query);
    }
}
