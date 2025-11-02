import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ReactDto } from './dto/react.dto';
import { MarkReadDto } from './dto/mark-read.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

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
        issueId: dto.issueId,
        participants: {
          create: [
            { userId: actor.id, role: 'OWNER' },
            ...((dto.participantUserIds || []).filter((id) => id !== actor.id).map((id) => ({ userId: id, role: 'MEMBER' }))),
          ],
        },
      },
      select: { id: true, eventId: true, kind: true, title: true, departmentId: true, issueId: true, createdAt: true },
    });
    return conv;
  }

  async listConversations(eventId: string, actor: { id: string; isSuperAdmin: boolean }) {
    await this.ensureEventMember(eventId, actor.id, actor.isSuperAdmin);
    return this.prisma.conversation.findMany({
      where: { eventId, isArchived: false, participants: { some: { userId: actor.id } } },
      select: { id: true, kind: true, title: true, departmentId: true, issueId: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async sendMessage(dto: SendMessageDto, actor: { id: string; isSuperAdmin: boolean }) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: dto.conversationId }, select: { eventId: true } });
    if (!conv) throw new NotFoundException();
    await this.ensureEventMember(conv.eventId, actor.id, actor.isSuperAdmin);
    const isParticipant = await this.prisma.participant.findFirst({ where: { conversationId: dto.conversationId, userId: actor.id } });
    if (!isParticipant) throw new ForbiddenException('Not a participant');
    const msg = await this.prisma.message.create({
      data: { conversationId: dto.conversationId, authorId: actor.id, body: dto.body, parentId: dto.parentId },
      select: { id: true, conversationId: true, authorId: true, body: true, parentId: true, createdAt: true },
    });
    await this.prisma.conversation.update({ where: { id: dto.conversationId }, data: { updatedAt: new Date() } });
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
    const now = new Date();
    await this.prisma.participant.update({
      where: { conversationId_userId: { conversationId: dto.conversationId, userId: actor.id } },
      data: { lastReadAt: now },
    }).catch(async () => {
      await this.prisma.participant.create({ data: { conversationId: dto.conversationId, userId: actor.id, lastReadAt: now } });
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
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { eventId: true } });
    if (!conv) throw new NotFoundException();
    const rows = await this.prisma.eventMembership.findMany({ where: { eventId: conv.eventId, userId: { in: userIds } }, select: { userId: true } });
    const validIds = new Set(rows.map(r => r.userId));
    const toAdd = userIds.filter(id => validIds.has(id));
    if (!toAdd.length) return { added: 0 };
    await this.prisma.$transaction(
      toAdd.map(uid => this.prisma.participant.upsert({ where: { conversationId_userId: { conversationId, userId: uid } }, update: {}, create: { conversationId, userId: uid, role: 'MEMBER' } }))
    );
    return { added: toAdd.length };
  }

  async listParticipants(conversationId: string, actor: { id: string; isSuperAdmin: boolean }) {
    await this.ensureParticipant(conversationId, actor.id);
    return this.prisma.participant.findMany({ where: { conversationId }, select: { userId: true, role: true, user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } } } });
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

  async listMessages(conversationId: string, actor: { id: string; isSuperAdmin: boolean }, limit = 50, before?: string) {
    await this.ensureParticipant(conversationId, actor.id);
    const where: any = { conversationId };
    if (before) where.createdAt = { lt: new Date(before) };
    const rows = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(200, limit)),
      select: { id: true, conversationId: true, authorId: true, body: true, parentId: true, createdAt: true },
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
    const withAtts = items.map((m) => ({ ...m, attachments: attsByMsg[m.id] || [] }));
    return { items: withAtts, nextCursor };
  }
}
