import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [AuthModule, NotificationsModule, ChatModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PrismaService],
  exports: [DepartmentsService],
})
export class DepartmentsModule { }
