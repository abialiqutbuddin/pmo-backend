import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventPermissionsService } from './event-permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardController } from './dashboard.controller';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [AuthModule, forwardRef(() => ChatModule)],
  controllers: [EventsController, DashboardController],
  providers: [EventsService, EventPermissionsService, PrismaService],
  exports: [EventsService, EventPermissionsService],
})
export class EventsModule { }

