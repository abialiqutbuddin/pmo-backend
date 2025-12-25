import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';
import { ChatPermissionsHelper } from './chat-permissions.helper';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [ChatGateway, ChatService, ChatPermissionsHelper],
  controllers: [ChatController],
  exports: [ChatPermissionsHelper, ChatGateway],
})
export class ChatModule { }


