import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatPermissionsHelper } from './chat-permissions.helper';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, JwtModule.register({}), NotificationsModule],
  providers: [ChatGateway, ChatService, ChatPermissionsHelper],
  controllers: [ChatController],
  exports: [ChatPermissionsHelper, ChatGateway],
})
export class ChatModule { }


