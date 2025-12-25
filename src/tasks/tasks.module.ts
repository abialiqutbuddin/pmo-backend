import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { EventTasksController } from './event-tasks.controller';
import { TaskCommentsController } from './task-comments.controller';
import { TaskCommentsService } from './task-comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerModule } from '../mail/mailer.module';
import { EventsModule } from '../events/events.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MailerModule, EventsModule, AuthModule, NotificationsModule],
  controllers: [TasksController, TaskCommentsController, EventTasksController],
  providers: [TasksService, TaskCommentsService, PrismaService],
  exports: [TasksService],
})
export class TasksModule { }
