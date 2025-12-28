import { Body, Controller, Get, Param, Patch, Post, UseGuards, Query, Delete } from '@nestjs/common';
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
import { ChatGateway } from './chat.gateway';
import { ChatPermissionsHelper } from './chat-permissions.helper';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
    private readonly chatPerms: ChatPermissionsHelper,
  ) { }

  @Post('conversations')
  createConv(@CurrentUser() user: any, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Get('events/:eventId/conversations')
  list(@Param('eventId') eventId: string, @CurrentUser() user: any) {
    return this.chat.listConversations(eventId, { id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });
  }

  @Post('messages')
  async send(@CurrentUser() user: any, @Body() dto: SendMessageDto) {
    const msg = await this.chat.sendMessage(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });

    // Broadcast to conversation room - clients should join conv rooms to receive updates
    const payload = { ...msg, isSystem: false };
    this.gateway.server.to(`conv:${dto.conversationId}`).emit('message.new', payload);

    return msg;
  }

  @Get('events/:eventId/permissions')
  async getPermissions(@Param('eventId') eventId: string, @CurrentUser() user: any) {
    // If admin or tenant manager, they have all permissions
    if (user.isSuperAdmin || user.isTenantManager) {
      return {
        canViewAllSystemGroups: true,
        canSendToSystemGroups: true,
        canDeleteMessages: true,
      };
    }
    return this.chatPerms.getUserChatPermissions(eventId, user.sub);
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
    return this.chat.addParticipants(conversationId, ids, { id: user.sub, isSuperAdmin: user.isSuperAdmin }).then(async (res) => {
      if ((res as any)?.messageId) {
        const msg = await this.prisma.message.findUnique({ where: { id: (res as any).messageId }, select: { id: true, conversationId: true, authorId: true, body: true, parentId: true, createdAt: true, author: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } } } });
        if (msg) this.gateway.server.to(`conv:${conversationId}`).emit('message.new', { ...msg, isSystem: true });
      }
      // notify clients to refresh participants
      this.gateway.server.to(`conv:${conversationId}`).emit('participants.updated', { conversationId });
      // Send a targeted invitation event to each newly added user so their chat list updates instantly
      try {
        const conv = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
          select: {
            id: true,
            kind: true,
            title: true,
            departmentId: true,
            // issueId removed
            updatedAt: true,
            participants: { select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, authorId: true, body: true, createdAt: true, author: { select: { id: true, fullName: true, email: true } } } },
          },
        });
        if (conv) {
          const payload: any = {
            id: conv.id,
            kind: conv.kind,
            title: conv.title,
            departmentId: conv.departmentId,
            // issueId removed
            updatedAt: conv.updatedAt,
            participants: conv.participants,
            lastMessage: conv.messages && conv.messages[0] ? conv.messages[0] : null,
            unreadCount: 0,
            lastMessageAllRead: false,
          };
          for (const uid of ids) {
            this.gateway.server.to(`user:${uid}`).emit('conversation.invited', payload);
          }
        }
      } catch { }
      return res;
    });
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
    return this.chat.listMessages(conversationId, { id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager }, n, b);
  }

  @Get('messages/:messageId/readers')
  readers(@Param('messageId') messageId: string, @CurrentUser() user: any) {
    return this.chat.messageReaders(messageId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Delete('conversations/:conversationId/participants/:userId')
  async removeParticipant(@Param('conversationId') conversationId: string, @Param('userId') userId: string, @CurrentUser() user: any) {
    const res = await this.chat.removeParticipant(conversationId, userId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    if ((res as any)?.messageId) {
      const msg = await this.prisma.message.findUnique({ where: { id: (res as any).messageId }, select: { id: true, conversationId: true, authorId: true, body: true, parentId: true, createdAt: true, author: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } } } });
      if (msg) this.gateway.server.to(`conv:${conversationId}`).emit('message.new', { ...msg, isSystem: true });
    }
    this.gateway.server.to(`conv:${conversationId}`).emit('participants.updated', { conversationId });
    // Force removed user's sockets to leave the conversation room
    await this.gateway.kickFromConversation(conversationId, userId);
    return res;
  }

  @Patch('conversations/:conversationId/participants/:userId')
  async updateParticipant(@Param('conversationId') conversationId: string, @Param('userId') userId: string, @Body() body: { role?: string }, @CurrentUser() user: any) {
    const r = await this.chat.updateParticipantRole(conversationId, userId, body?.role, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    this.gateway.server.to(`conv:${conversationId}`).emit('participants.updated', { conversationId });
    return r;
  }
}
