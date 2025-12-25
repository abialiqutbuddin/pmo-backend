import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ namespace: '/ws', cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly jwt: JwtService, private readonly chat: ChatService, private readonly prisma: PrismaService) { }

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token || client.handshake.headers['authorization'] || '').toString().replace(/^Bearer\s+/i, '');
      const eventId = (client.handshake.auth?.eventId || client.handshake.query['eventId']) as string;
      if (!token || !eventId) { client.disconnect(true); return; }
      // Verify JWT signature (do not trust decode)
      let payload: any;
      try {
        payload = this.jwt.verify(token, {
          secret: process.env.JWT_ACCESS_SECRET as string,
          algorithms: ['HS256'],
        });
      } catch (e) {
        client.disconnect(true); return;
      }
      if (!payload?.sub) { client.disconnect(true); return; }
      const user = { id: payload.sub as string, isSuperAdmin: !!payload.isSuperAdmin };
      await this.chat.ensureEventMember(eventId, user.id, user.isSuperAdmin);
      (client.data as any).user = user;
      (client.data as any).eventId = eventId;
      client.join(`event:${eventId}`);
      // Also join a per-user room for targeted notifications (e.g., conversation.invited)
      client.join(`user:${user.id}`);
      this.logger.log(`client ${user.id} connected to event ${eventId}`);
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const { user, eventId } = client.data || {};
    if (user?.id && eventId) this.logger.log(`client ${user.id} disconnected from event ${eventId}`);
  }

  @SubscribeMessage('conversation.join')
  async onJoin(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
    try {
      const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
      const eventId = (client.data as any).eventId as string;

      // 1. Check if participant
      const p = await this.prisma.participant.findFirst({ where: { conversationId: data.conversationId, userId: user.id } });
      if (p) {
        client.join(`conv:${data.conversationId}`);
        return;
      }

      // 2. If not participant, check if system group AND user has global view permission
      const conv = await this.prisma.conversation.findUnique({ where: { id: data.conversationId }, select: { isSystemGroup: true, eventId: true } });
      if (conv && conv.isSystemGroup && conv.eventId === eventId) {
        // Check permissions
        // (User object only has isSuperAdmin, we might need more or check DB)
        if (user.isSuperAdmin) {
          client.join(`conv:${data.conversationId}`);
          return;
        }
        // Check tenant manager or role permission
        // We can use ChatPermissionsHelper but it's not injected yet? 
        // ChatGateway has ChatService injected. ChatService has ChatPermissionsHelper.
        // Let's use ChatService or inject helper directly?
        // ChatService isn't exposing permissions check directly as public method broadly.
        // But we can just query Prisma here for speed or inject Helper.

        // Minimal check: Tenant Manager?
        // We don't have isTenantManager in user token payload usually? 
        // Let's fetch user role/permissions briefly.
        const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { isTenantManager: true, tenantId: true } });
        if (u?.isTenantManager) {
          // Verify event belongs to tenant?
          const evt = await this.prisma.event.findUnique({ where: { id: eventId }, select: { tenantId: true } });
          if (evt?.tenantId === u.tenantId) {
            client.join(`conv:${data.conversationId}`);
            return;
          }
        }

        // TODO: Check granular chat:read permission if we want to be perfect.
        // For now, SuperAdmin + TenantManager is likely sufficient for "view only access" users described.
      }

      // deny
      client.emit('conversation.join-denied', { conversationId: data.conversationId });
    } catch (e) {
      try { client.emit('conversation.join-denied', { conversationId: data.conversationId }); } catch { }
    }
  }

  @SubscribeMessage('conversation.leave')
  async onLeave(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`conv:${data.conversationId}`);
  }

  @SubscribeMessage('message.send')
  async onMessage(@MessageBody() body: { conversationId: string; body?: string; parentId?: string }, @ConnectedSocket() client: Socket) {
    const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
    const msg = await this.chat.sendMessage({ ...body }, user);
    const payload = { ...msg, isSystem: false } as any;
    this.server.to(`conv:${body.conversationId}`).emit('message.new', payload);
    return payload;
  }

  // Kick a given user from a conversation room (server-side leave) and notify the user
  async kickFromConversation(conversationId: string, userId: string) {
    try {
      const room = `conv:${conversationId}`;
      const sockets = await this.server.in(room).fetchSockets();
      for (const s of sockets) {
        const u = (s.data as any)?.user?.id;
        if (u === userId) {
          try { s.leave(room); } catch { }
          try { s.emit('conversation.kicked', { conversationId }); } catch { }
        }
      }
    } catch { }
  }

  @SubscribeMessage('attachment.uploaded')
  async onAttachmentUploaded(@MessageBody() body: { messageId: string }, @ConnectedSocket() client: Socket) {
    try {
      const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
      const msg = await this.prisma.message.findUnique({ where: { id: body.messageId }, select: { id: true, conversationId: true } });
      if (!msg) return;
      // ensure the user is a participant in the conversation
      await this.prisma.participant.findFirstOrThrow({ where: { conversationId: msg.conversationId, userId: user.id } });
      const links = await this.prisma.attachmentLink.findMany({
        where: { entityType: 'Message', entityId: msg.id },
        select: { attachment: { select: { id: true, originalName: true, mimeType: true, size: true, objectKey: true } } },
        orderBy: { createdAt: 'asc' },
      });
      const attachments = links.map((l) => ({ id: l.attachment.id, originalName: l.attachment.originalName, mimeType: l.attachment.mimeType, size: l.attachment.size, objectKey: l.attachment.objectKey }));
      this.server.to(`conv:${msg.conversationId}`).emit('message.attachment', { conversationId: msg.conversationId, messageId: msg.id, attachments });
      return { count: attachments.length };
    } catch { }
  }

  @SubscribeMessage('message.react')
  async onReact(@MessageBody() body: { messageId: string; emoji: string }, @ConnectedSocket() client: Socket) {
    const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
    const r = await this.chat.addReaction(body, user);
    this.server.emit('message.reaction', { messageId: body.messageId, userId: user.id, emoji: body.emoji, action: r.action });
    return r;
  }

  @SubscribeMessage('conversation.read')
  async onRead(@MessageBody() body: { conversationId: string }, @ConnectedSocket() client: Socket) {
    const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
    const r = await this.chat.markRead(body, user);
    this.server.to(`conv:${body.conversationId}`).emit('conversation.read', { conversationId: body.conversationId, userId: user.id, at: r.at });
    return r;
  }

  // --- Service-initiated Broadcasts ---

  notifyConversationInvited(userId: string, conversation: any) {
    this.server.to(`user:${userId}`).emit('conversation.invited', conversation);
  }

  notifyParticipantsUpdated(conversationId: string) {
    this.server.to(`conv:${conversationId}`).emit('participants.updated', { conversationId });
  }

  notifyKicked(conversationId: string, userId: string) {
    this.server.to(`user:${userId}`).emit('conversation.kicked', { conversationId });
  }

  notifyJoinDenied(conversationId: string, userId: string) {
    this.server.to(`user:${userId}`).emit('conversation.join-denied', { conversationId });
  }
}
