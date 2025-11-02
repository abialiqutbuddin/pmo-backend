import { Body, Controller, Get, Param, Patch, Post, UseGuards, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ReactDto } from './dto/react.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { CreateTaskFromMessageDto } from './dto/create-task-from-message.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AddParticipantDto } from './dto/add-participant.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService, private readonly prisma: PrismaService) {}

  @Post('conversations')
  createConv(@CurrentUser() user: any, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Get('events/:eventId/conversations')
  list(@Param('eventId') eventId: string, @CurrentUser() user: any) {
    return this.chat.listConversations(eventId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Post('messages')
  send(@CurrentUser() user: any, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Post('react')
  react(@CurrentUser() user: any, @Body() dto: ReactDto) {
    return this.chat.addReaction(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Patch('read')
  read(@CurrentUser() user: any, @Body() dto: MarkReadDto) {
    return this.chat.markRead(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Post('create-task-from-message')
  async createTaskFromMessage(@CurrentUser() user: any, @Body() dto: CreateTaskFromMessageDto) {
    // simplest path: create a task from the message body
    const msg = await this.prisma.message.findUnique({ where: { id: dto.messageId }, select: { body: true, conversationId: true } });
    if (!msg) return { error: 'Message not found' };
    const title = (dto.title || msg.body || 'New Task').slice(0, 120);
    const data: any = {
      eventId: dto.eventId,
      creatorId: user.sub,
      title,
      description: `Created from message ${dto.messageId} in conversation ${msg.conversationId}`,
      priority: 3,
      status: 'todo',
    };
    if (dto.departmentId) data.departmentId = dto.departmentId;
    const task = await this.prisma.task.create({ data, select: { id: true, title: true, status: true, departmentId: true } });
    return task;
  }

  @Post('direct')
  createDirect(@CurrentUser() user: any, @Body() body: { eventId: string; userId: string }) {
    return this.chat.getOrCreateDirect(body.eventId, body.userId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Get('conversations/:conversationId/participants')
  listParticipants(@Param('conversationId') conversationId: string, @CurrentUser() user: any) {
    return this.chat.listParticipants(conversationId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Post('conversations/:conversationId/participants')
  addParticipants(@Param('conversationId') conversationId: string, @Body() dto: AddParticipantDto, @CurrentUser() user: any) {
    const ids = dto.userIds || [];
    return this.chat.addParticipants(conversationId, ids, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Get('conversations/:conversationId/messages')
  listMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const n = Math.max(1, Math.min(200, parseInt(limit || '50', 10)));
    const b = before && before !== 'null' && before !== 'undefined' ? before : undefined;
    return this.chat.listMessages(conversationId, { id: user.sub, isSuperAdmin: user.isSuperAdmin }, n, b);
  }
}
