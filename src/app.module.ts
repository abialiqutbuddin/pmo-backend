import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { TasksModule } from './tasks/tasks.module';
// import { IssuesModule } from './issues/issues.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ChatModule } from './chat/chat.module';
import { MediaModule } from './media/media.module';
import { VenuesModule } from './venues/venues.module';
import { ZonesModule } from './zones/zones.module';

@Module({
  imports: [AuthModule,
    UsersModule, EventsModule,DepartmentsModule,TasksModule, FeedbackModule,AttachmentsModule, ChatModule, MediaModule, VenuesModule, ZonesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
