import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ChatController } from './chat.controller';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [ChatGateway, ChatService],
  controllers: [ChatController],
})
export class ChatModule {}

