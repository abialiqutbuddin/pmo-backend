import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardController } from './dashboard.controller';

@Module({
  controllers: [EventsController, DashboardController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}
