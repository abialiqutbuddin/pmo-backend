import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ReactDto } from './dto/react.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { ChatPermissionsHelper } from './chat-permissions.helper';
import { ChatGateway } from './chat.gateway';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatPerms: ChatPermissionsHelper,
    private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => ChatGateway)) private readonly gateway: ChatGateway,
  ) { }

  async ensureEventMember(eventId: string, userId: string, isSuperAdmin: boolean) {
    if (isSuperAdmin) return;
    const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
    if (!m) throw new ForbiddenException('Not in event');
  }

  async createConversation(dto: CreateConversationDto, actor: { id: string; isSuperAdmin: boolean }) {
    await this.ensureEventMember(dto.eventId, actor.id, actor.isSuperAdmin);
    const conv = await this.prisma.conversation.create({
      data: {
        eventId: dto.eventId,
        kind: dto.kind,
        title: dto.title,
        departmentId: dto.departmentId,
        participants: {
          create: [
            { userId: actor.id, role: 'OWNER' },
            ...((dto.participantUserIds || []).filter((id) => id !== actor.id).map((id) => ({ userId: id, role: 'MEMBER' }))),
          ],
        },
      },
      select: { id: true, eventId: true, kind: true, title: true, departmentId: true, createdAt: true, participants: { select: { userId: true, user: { select: { fullName: true, email: true } } } } },
    });

    // Notify invited participants
    for (const p of conv.participants) {
      if (p.userId !== actor.id) {
        this.gateway.notifyConversationInvited(p.userId, conv);
      }
    }

    return conv;
  }

  async listConversations(eventId: string, actor: { id: string; isSuperAdmin: boolean; isTenantManager?: boolean }) {
    await this.ensureEventMember(eventId, actor.id, actor.isSuperAdmin);

    // Check if user has global chat:read permission (can view all system groups)
    const isAdmin = actor.isSuperAdmin || actor.isTenantManager;
    const chatPerms = isAdmin ? null : await this.chatPerms.getUserChatPermissions(eventId, actor.id);
    const hasGlobalChatRead = isAdmin || chatPerms?.canViewAllSystemGroups;

    // Build where clause
    const whereClause: any = { eventId, isArchived: false };
    if (hasGlobalChatRead) {
      // Can see all system groups OR conversations they're a participant of
      whereClause.OR = [
        { isSystemGroup: true },
        { participants: { some: { userId: actor.id } } },
      ];
    } else {
      // Only see conversations they're a participant of
      whereClause.participants = { some: { userId: actor.id } };
    }

    const rows = await this.prisma.conversation.findMany({
      where: whereClause,
      select: {
        id: true,
        kind: true,
        title: true,
        departmentId: true,
        isActive: true,
        isSystemGroup: true,
        updatedAt: true,
        participants: { select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, authorId: true, body: true, createdAt: true, author: { select: { id: true, fullName: true, email: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    // shape + compute unreadCount for actor
    const results = [] as any[];
    for (const r of rows) {
      const myPart = r.participants.find((p) => p.userId === actor.id);
      const lastReadAt = myPart?.lastReadAt || new Date(0);
      const unreadCount = await this.prisma.message.count({
        where: {
          conversationId: r.id,
          createdAt: { gt: lastReadAt },
          NOT: { authorId: actor.id },
        },
      });
      // compute last message read state for initial UI accuracy
      let lastMessageAllRead = false;
      if (r.messages && r.messages[0]) {
        const last = r.messages[0];
        if (last.authorId === actor.id) {
          const others = r.participants.filter((p) => p.userId !== actor.id);
          lastMessageAllRead = others.length > 0 && others.every((p) => p.lastReadAt && p.lastReadAt >= last.createdAt);
        }
      }
      results.push({
        id: r.id,
        kind: r.kind,
        title: r.title,
        departmentId: r.departmentId,
        isActive: r.isActive,
        isSystemGroup: r.isSystemGroup,
        updatedAt: r.updatedAt,
        lastMessage: r.messages && r.messages[0]
          ? {
            id: r.messages[0].id,
            authorId: r.messages[0].authorId,
            body: r.messages[0].body,
            createdAt: r.messages[0].createdAt,
            author: r.messages[0].author,
          }
          : null,
        participants: r.participants,
        unreadCount,
        lastMessageAllRead,
      });
    }
    return results;
  }

  async sendMessage(dto: SendMessageDto, actor: { id: string; isSuperAdmin: boolean; isTenantManager?: boolean }) {
    console.log(`[Trace] sendMessage called by ${actor.id} for conv ${dto.conversationId}`);
    const conv = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      select: { id: true, eventId: true, isActive: true, isSystemGroup: true },
    });
    if (!conv) throw new NotFoundException();
    if (!conv.isActive) throw new ForbiddenException('This channel is read-only');
    await this.ensureEventMember(conv.eventId, actor.id, actor.isSuperAdmin);

    const isParticipant = await this.prisma.participant.findFirst({
      where: { conversationId: dto.conversationId, userId: actor.id },
    });

    if (!isParticipant) {
      // If not a participant, check if they have global send_message permission
      if (conv.isSystemGroup) {
        const isAdmin = actor.isSuperAdmin || actor.isTenantManager;
        if (!isAdmin) {
          const perms = await this.chatPerms.getUserChatPermissions(conv.eventId, actor.id);
          if (!perms.canSendToSystemGroups) {
            throw new ForbiddenException('Not a participant');
          }
        }
        // Admin or has send permission - allow
      } else {
        throw new ForbiddenException('Not a participant');
      }
    }

    const msg = await this.prisma.message.create({
      data: { conversationId: dto.conversationId, authorId: actor.id, body: dto.body, parentId: dto.parentId },
      select: {
        id: true,
        conversationId: true,
        authorId: true,
        body: true,
        parentId: true,
        createdAt: true,
        author: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } },
      },
    });
    await this.prisma.conversation.update({ where: { id: dto.conversationId }, data: { updatedAt: new Date() } });

    // Handle @Mentions (in-app notifications)
    if (dto.body) {
      const mentionRegex = /@\[([^\]]+)\]\(user:([^)]+)\)/g;
      const mentionedIds = new Set<string>();
      let match;
      while ((match = mentionRegex.exec(dto.body)) !== null) {
        if (match[2]) mentionedIds.add(match[2]);
      }

      for (const uid of mentionedIds) {
        if (uid === actor.id) continue;
        await this.notifications.create({
          userId: uid,
          eventId: conv.eventId,
          kind: 'MENTION',
          title: `${msg.author?.fullName || 'Someone'} mentioned you in chat`,
          body: (msg.body && msg.body.length > 50) ? msg.body.substring(0, 50) + '...' : (msg.body || 'New message'),
          link: `/events/${conv.eventId}/chat?roomId=${conv.id}`,
        });
      }
    }

    // Send push notifications to OFFLINE participants (non-muted)
    await this.sendPushToOfflineParticipants(conv, msg, actor.id);

    return msg;
  }

  async addReaction(dto: ReactDto, actor: { id: string; isSuperAdmin: boolean }) {
    const msg = await this.prisma.message.findUnique({ where: { id: dto.messageId }, select: { conversationId: true } });
    if (!msg) throw new NotFoundException();
    const conv = await this.prisma.conversation.findUnique({ where: { id: msg.conversationId }, select: { eventId: true } });
    if (!conv) throw new NotFoundException();
    await this.ensureEventMember(conv.eventId, actor.id, actor.isSuperAdmin);
    try {
      const r = await this.prisma.reaction.create({ data: { messageId: dto.messageId, userId: actor.id, emoji: dto.emoji } });
      return { action: 'added', id: r.id };
    } catch {
      await this.prisma.reaction.delete({ where: { messageId_userId_emoji: { messageId: dto.messageId, userId: actor.id, emoji: dto.emoji } } });
      return { action: 'removed' };
    }
  }

  async markRead(dto: MarkReadDto, actor: { id: string; isSuperAdmin: boolean }) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: dto.conversationId }, select: { eventId: true } });
    if (!conv) throw new NotFoundException();
    await this.ensureEventMember(conv.eventId, actor.id, actor.isSuperAdmin);
    await this.ensureParticipant(dto.conversationId, actor.id);
    const now = new Date();
    await this.prisma.participant.update({
      where: { conversationId_userId: { conversationId: dto.conversationId, userId: actor.id } },
      data: { lastReadAt: now },
    });
    return { ok: true, at: now.toISOString() };
  }

  private async ensureParticipant(conversationId: string, userId: string) {
    const p = await this.prisma.participant.findFirst({ where: { conversationId, userId } });
    if (!p) throw new ForbiddenException('Not a participant');
    return p;
  }

  async addParticipants(conversationId: string, userIds: string[], actor: { id: string; isSuperAdmin: boolean }) {
    await this.ensureParticipant(conversationId, actor.id);
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, eventId: true, kind: true, title: true, isSystemGroup: true, participants: { where: { userId: actor.id }, select: { role: true } } },
    });
    if (!conv) throw new NotFoundException();

    // Block manual member management for system groups
    if (conv.isSystemGroup) {
      throw new ForbiddenException(
        'Cannot manually add members to system groups. Membership is managed via department assignments and role permissions.'
      );
    }

    // Only OWNER can add users to GROUP conversations
    if (conv.kind === 'GROUP') {
      const myRole = conv.participants?.[0]?.role || 'MEMBER';
      if (myRole !== 'OWNER') throw new ForbiddenException('Only the group creator can add members');
    }
    const rows = await this.prisma.eventMembership.findMany({ where: { eventId: conv.eventId, userId: { in: userIds } }, select: { userId: true } });
    const validIds = new Set(rows.map(r => r.userId));
    const toAdd = userIds.filter(id => validIds.has(id));
    if (!toAdd.length) return { added: 0 };
    await this.prisma.$transaction(
      toAdd.map(uid => this.prisma.participant.upsert({ where: { conversationId_userId: { conversationId, userId: uid } }, update: {}, create: { conversationId, userId: uid, role: 'MEMBER' } }))
    );
    // Post a simple system message noting who was added (authored by actor)
    const users = await this.prisma.user.findMany({ where: { id: { in: toAdd } }, select: { fullName: true, email: true } });
    const names = users.map(u => u.fullName || u.email).join(', ');
    const m = await this.prisma.message.create({ data: { conversationId, authorId: actor.id, body: `added ${names}` }, select: { id: true } });
    await this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    // Notify new members
    for (const uid of toAdd) {
      this.gateway.notifyConversationInvited(uid, conv);
    }
    // Notify room of list update
    this.gateway.notifyParticipantsUpdated(conversationId);

    return { added: toAdd.length, messageId: m.id };
  }

  async removeParticipant(conversationId: string, userId: string, actor: { id: string; isSuperAdmin: boolean }) {
    await this.ensureParticipant(conversationId, actor.id);
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { kind: true, isSystemGroup: true, participants: { select: { userId: true, role: true } } },
    });
    if (!conv) throw new NotFoundException();

    // Block manual member management for system groups
    if (conv.isSystemGroup) {
      throw new ForbiddenException(
        'Cannot manually remove members from system groups. Membership is managed via department assignments.'
      );
    }

    if (conv.kind !== 'GROUP') throw new ForbiddenException('Not allowed');
    const me = conv.participants.find((p) => p.userId === actor.id);
    if (!me) throw new ForbiddenException('Not in group');
    const isSelf = userId === actor.id;
    if (!isSelf && me.role !== 'OWNER') throw new ForbiddenException('Only the group creator can remove members');
    const target = conv.participants.find((p) => p.userId === userId);
    if (!target) return { ok: true };
    if (!isSelf && target.role === 'OWNER') throw new ForbiddenException('Cannot remove the owner');
    await this.prisma.participant.delete({ where: { conversationId_userId: { conversationId, userId } } });
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } });
    const m = await this.prisma.message.create({ data: { conversationId, authorId: actor.id, body: `removed ${u?.fullName || u?.email || userId}` }, select: { id: true } });
    await this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    // Notify logic
    if (!isSelf) {
      this.gateway.notifyKicked(conversationId, userId);
    } else {
      // I left - notify me anyway to remove from UI list?
      // Actually if I leave, I might want the conv to disappear from my list immediately.
      // But UI usually handles optimistic removal.
    }
    this.gateway.notifyParticipantsUpdated(conversationId);

    return { ok: true, messageId: m.id };
  }

  async updateParticipantRole(conversationId: string, userId: string, role: string | undefined, actor: { id: string; isSuperAdmin: boolean }) {
    await this.ensureParticipant(conversationId, actor.id);
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { kind: true, participants: { select: { userId: true, role: true } } } });
    if (!conv) throw new NotFoundException();
    if (conv.kind !== 'GROUP') throw new ForbiddenException('Not allowed');
    const me = conv.participants.find((p) => p.userId === actor.id);
    if (!me || me.role !== 'OWNER') throw new ForbiddenException('Only the group creator can manage roles');
    if (!role || (role !== 'MEMBER' && role !== 'OWNER')) throw new BadRequestException('Invalid role');
    if (role === 'OWNER') {
      // transfer ownership: make target OWNER and downgrade previous owner to MEMBER
      await this.prisma.$transaction([
        this.prisma.participant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { role: 'OWNER' } }),
        this.prisma.participant.update({ where: { conversationId_userId: { conversationId, userId: actor.id } }, data: { role: 'MEMBER' } }),
      ]);
    } else {
      await this.prisma.participant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { role: 'MEMBER' } });
    }

    this.gateway.notifyParticipantsUpdated(conversationId);
    return { ok: true };
  }

  async listParticipants(conversationId: string, actor: { id: string; isSuperAdmin: boolean }) {
    await this.ensureParticipant(conversationId, actor.id);
    return this.prisma.participant.findMany({ where: { conversationId }, select: { userId: true, role: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } } } });
  }

  async getOrCreateDirect(eventId: string, otherUserId: string, actor: { id: string; isSuperAdmin: boolean }) {
    await this.ensureEventMember(eventId, actor.id, actor.isSuperAdmin);
    await this.ensureEventMember(eventId, otherUserId, actor.isSuperAdmin);
    const existing = await this.prisma.conversation.findFirst({
      where: {
        eventId,
        kind: 'DIRECT',
        participants: { some: { userId: actor.id } },
        AND: { participants: { some: { userId: otherUserId } } },
        isArchived: false,
      },
      select: { id: true, eventId: true, kind: true, title: true, updatedAt: true },
    });
    if (existing) return existing;
    const conv = await this.prisma.conversation.create({
      data: {
        eventId,
        kind: 'DIRECT',
        participants: { create: [{ userId: actor.id, role: 'OWNER' }, { userId: otherUserId, role: 'MEMBER' }] },
      },
      select: { id: true, eventId: true, kind: true, title: true, updatedAt: true },
    });
    return conv;
  }

  async listMessages(conversationId: string, actor: { id: string; isSuperAdmin: boolean; isTenantManager?: boolean }, limit = 50, before?: string) {
    // Check if user is participant
    const p = await this.prisma.participant.findFirst({ where: { conversationId, userId: actor.id } });

    if (!p) {
      // Not a participant - check if it's a system group and user has permissions
      const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { isSystemGroup: true, eventId: true } });
      if (!conv) throw new NotFoundException();

      if (conv.isSystemGroup) {
        const isAdmin = actor.isSuperAdmin || actor.isTenantManager;
        if (!isAdmin) {
          const perms = await this.chatPerms.getUserChatPermissions(conv.eventId, actor.id);
          if (!perms.canViewAllSystemGroups) {
            throw new ForbiddenException('Not a participant');
          }
        }
        // Admin or has view permission - allow
      } else {
        throw new ForbiddenException('Not a participant');
      }
    }

    const where: any = { conversationId };
    if (before) where.createdAt = { lt: new Date(before) };
    const rows = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(200, limit)),
      select: {
        id: true,
        conversationId: true,
        authorId: true,
        body: true,
        parentId: true,
        createdAt: true,
        author: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } },
      },
    });
    const items = rows.reverse();
    const ids = items.map((m) => m.id);

    // Batch load attachments linked to these messages
    let attsByMsg: Record<string, { id: string; originalName: string; mimeType: string; size: number; objectKey: string | null }[]> = {};
    if (ids.length) {
      const links = await this.prisma.attachmentLink.findMany({
        where: { entityType: 'Message', entityId: { in: ids } },
        select: {
          entityId: true,
          attachment: { select: { id: true, originalName: true, mimeType: true, size: true, objectKey: true } },
        },
      });
      for (const l of links) {
        const arr = attsByMsg[l.entityId] || (attsByMsg[l.entityId] = []);
        arr.push({ id: l.attachment.id, originalName: l.attachment.originalName, mimeType: l.attachment.mimeType, size: l.attachment.size, objectKey: l.attachment.objectKey });
      }
    }

    const nextCursor = items.length ? items[0].createdAt.toISOString() : null;
    const withAtts = items.map((m) => ({
      ...m,
      attachments: attsByMsg[m.id] || [],
      isSystem: typeof m.body === 'string' && /^(added |removed )/i.test(m.body.trim()),
    }));
    return { items: withAtts, nextCursor };
  }

  async messageReaders(messageId: string, actor: { id: string; isSuperAdmin: boolean }) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId }, select: { id: true, conversationId: true, createdAt: true } });
    if (!msg) throw new NotFoundException('Message not found');
    await this.ensureParticipant(msg.conversationId, actor.id);
    // Fetch participants and filter in memory to avoid missing index
    const parts = await this.prisma.participant.findMany({ where: { conversationId: msg.conversationId }, select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } } } });
    const readers = parts.filter((p) => p.lastReadAt && p.lastReadAt >= msg.createdAt).map((p) => ({
      userId: p.userId,
      fullName: p.user?.fullName || p.userId,
      email: p.user?.email,
      itsId: p.user?.itsId,
      profileImage: p.user?.profileImage,
      readAt: p.lastReadAt,
    }));
    return readers;
  }

  /**
   * Send push notifications to offline participants
   * Filters out: sender, muted participants, online users
   */
  private async sendPushToOfflineParticipants(
    conv: { id: string; eventId: string; kind?: string; title?: string | null; isSystemGroup?: boolean },
    msg: { id: string; body?: string | null; author?: { fullName?: string | null } | null },
    senderId: string
  ) {
    console.log(`[Trace] sendPushToOfflineParticipants called for ${conv.id}`);
    try {
      // Get all participants except sender, who are not muted
      const participants = await this.prisma.participant.findMany({
        where: {
          conversationId: conv.id,
          userId: { not: senderId },
          isMuted: false,
        },
        include: {
          user: { select: { id: true, fullName: true, fcmToken: true } },
        },
      });

      if (participants.length === 0) return;

      // Get conversation details for title
      const convDetails = await this.prisma.conversation.findUnique({
        where: { id: conv.id },
        select: { kind: true, title: true, participants: { select: { user: { select: { fullName: true } } } } },
      });

      // Filter to users NOT currently viewing this conversation
      // This means: offline users + online users on other screens all get push
      // Only users with the chat open (in conversation room) are skipped
      const recipientsForPush = participants.filter(
        (p) => !this.gateway.isUserInConversation(conv.id, p.userId)
      );

      if (recipientsForPush.length === 0) return;

      // Determine notification title based on conversation type
      let title: string;
      if (convDetails?.kind === 'DIRECT') {
        title = msg.author?.fullName || 'New message';
      } else {
        title = convDetails?.title || 'Group Chat';
      }

      // Body is the message preview
      const body = msg.body?.substring(0, 100) || 'New message';

      // Send push to each offline user with FCM token
      const NOTIFICATIONS_SERVICE_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3001';
      const NOTIFICATIONS_API_KEY = process.env.NOTIFICATIONS_API_KEY || 'dev-key-123';
      console.log(`[Push Debug] Recipients for push: ${recipientsForPush.length}, with FCM tokens: ${recipientsForPush.filter(p => p.user.fcmToken).length}`);

      for (const p of recipientsForPush) {
        // Emit socket event for real-time list updates (to user's personal room)
        this.gateway.emitToUser(p.userId, 'message.new', msg);

        if (!p.user.fcmToken) {
          console.log(`[Push Debug] Skipping ${p.userId} - no FCM token`);
          continue;
        }
        console.log(`[Push Debug] Sending push to ${p.userId}`);

        try {
          const axios = require('axios');
          await axios.post(
            `${NOTIFICATIONS_SERVICE_URL}/notifications/send`,
            {
              channel: 'PUSH',
              profile: 'FCM',
              recipient: p.user.fcmToken,
              data: {
                title,
                body,
                collapseKey: conv.id,
                data: {
                  type: convDetails?.kind === 'DIRECT' ? 'dm' : 'group',
                  conversationId: conv.id,
                  eventId: conv.eventId,
                  senderId,
                },
              },
            },
            {
              headers: { 'x-api-key': NOTIFICATIONS_API_KEY },
              timeout: 5000,
            }
          );
        } catch (pushErr) {
          // Don't fail the message send if push fails
          console.error(`Failed to send push to ${p.userId}:`, pushErr);
        }
      }
    } catch (err) {
      console.error('Error in sendPushToOfflineParticipants:', err);
    }
  }
}
