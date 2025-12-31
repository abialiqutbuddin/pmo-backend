import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody, ConnectedSocket, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ namespace: '/ws', cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  // Track online users per event for push notification filtering
  private onlineUsers = new Map<string, Set<string>>(); // eventId -> Set of userIds

  // Track which conversation each user is currently viewing
  private activeConversations = new Map<string, Set<string>>(); // conversationId -> Set of userIds

  constructor(private readonly jwt: JwtService, private readonly chat: ChatService, private readonly prisma: PrismaService) { }

  // Public method to check if a user is online in an event
  isUserOnline(eventId: string, userId: string): boolean {
    return this.onlineUsers.get(eventId)?.has(userId) ?? false;
  }

  // Public method to check if a user is currently viewing a specific conversation
  isUserInConversation(conversationId: string, userId: string): boolean {
    return this.activeConversations.get(conversationId)?.has(userId) ?? false;
  }

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

      // Track online user
      if (!this.onlineUsers.has(eventId)) {
        this.onlineUsers.set(eventId, new Set());
      }
      this.onlineUsers.get(eventId)!.add(user.id);

      this.logger.log(`client ${user.id} connected to event ${eventId}`);
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const { user, eventId, activeConvs } = client.data || {};
    if (user?.id && eventId) {
      // Remove from online tracking
      const eventUsers = this.onlineUsers.get(eventId);
      if (eventUsers) {
        eventUsers.delete(user.id);
        if (eventUsers.size === 0) {
          this.onlineUsers.delete(eventId);
        }
      }
      // Clean up active conversation tracking
      if (activeConvs) {
        for (const convId of activeConvs) {
          const convUsers = this.activeConversations.get(convId);
          if (convUsers) {
            convUsers.delete(user.id);
            if (convUsers.size === 0) {
              this.activeConversations.delete(convId);
            }
          }
        }
      }
      this.logger.log(`client ${user.id} disconnected from event ${eventId}`);
    }
  }

  @SubscribeMessage('conversation.join')
  async onJoin(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
    try {
      const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
      const eventId = (client.data as any).eventId as string;

      // Helper to track user joining conversation
      const trackJoin = () => {
        client.join(`conv:${data.conversationId}`);
        // Track active conversation for push notification filtering
        if (!this.activeConversations.has(data.conversationId)) {
          this.activeConversations.set(data.conversationId, new Set());
        }
        this.activeConversations.get(data.conversationId)!.add(user.id);
        // Store on socket for cleanup on disconnect/leave
        if (!(client.data as any).activeConvs) {
          (client.data as any).activeConvs = new Set<string>();
        }
        (client.data as any).activeConvs.add(data.conversationId);
      };

      // 1. Check if participant
      const p = await this.prisma.participant.findFirst({ where: { conversationId: data.conversationId, userId: user.id } });
      if (p) {
        trackJoin();
        return;
      }

      // 2. If not participant, check if system group AND user has global view permission
      const conv = await this.prisma.conversation.findUnique({ where: { id: data.conversationId }, select: { isSystemGroup: true, eventId: true } });
      if (conv && conv.isSystemGroup && conv.eventId === eventId) {
        if (user.isSuperAdmin) {
          trackJoin();
          return;
        }
        const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { isTenantManager: true, tenantId: true } });
        if (u?.isTenantManager) {
          const evt = await this.prisma.event.findUnique({ where: { id: eventId }, select: { tenantId: true } });
          if (evt?.tenantId === u.tenantId) {
            trackJoin();
            return;
          }
        }
      }

      // deny
      client.emit('conversation.join-denied', { conversationId: data.conversationId });
    } catch (e) {
      try { client.emit('conversation.join-denied', { conversationId: data.conversationId }); } catch { }
    }
  }

  @SubscribeMessage('conversation.leave')
  async onLeave(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
    const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
    client.leave(`conv:${data.conversationId}`);
    // Remove from active conversation tracking
    if (user?.id) {
      const convUsers = this.activeConversations.get(data.conversationId);
      if (convUsers) {
        convUsers.delete(user.id);
        if (convUsers.size === 0) {
          this.activeConversations.delete(data.conversationId);
        }
      }
      // Remove from socket's tracked conversations
      (client.data as any).activeConvs?.delete(data.conversationId);
    }
  }

  @SubscribeMessage('message.send')
  async onMessage(@MessageBody() body: { conversationId: string; body?: string; parentId?: string }, @ConnectedSocket() client: Socket) {
    const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
    const msg = await this.chat.sendMessage({ ...body }, user);
    const payload = { ...msg, isSystem: false } as any;

    // Only emit to conversation room - HTTP API handles user room emissions
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
    if (!user) throw new WsException('Unauthorized');
    const r = await this.chat.addReaction(body, user);
    this.server.emit('message.reaction', { messageId: body.messageId, userId: user.id, emoji: body.emoji, action: r.action });
    return r;
  }

  @SubscribeMessage('conversation.read')
  async onRead(@MessageBody() body: { conversationId: string }, @ConnectedSocket() client: Socket) {
    const user = (client.data as any).user as { id: string; isSuperAdmin: boolean };
    if (!user) throw new WsException('Unauthorized');
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

  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
