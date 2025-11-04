"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ChatService = class ChatService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureEventMember(eventId, userId, isSuperAdmin) {
        if (isSuperAdmin)
            return;
        const m = await this.prisma.eventMembership.findFirst({ where: { eventId, userId } });
        if (!m)
            throw new common_1.ForbiddenException('Not in event');
    }
    async createConversation(dto, actor) {
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
            select: { id: true, eventId: true, kind: true, title: true, departmentId: true, createdAt: true },
        });
        return conv;
    }
    async listConversations(eventId, actor) {
        await this.ensureEventMember(eventId, actor.id, actor.isSuperAdmin);
        const rows = await this.prisma.conversation.findMany({
            where: { eventId, isArchived: false, participants: { some: { userId: actor.id } } },
            select: {
                id: true,
                kind: true,
                title: true,
                departmentId: true,
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
        const results = [];
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
    async sendMessage(dto, actor) {
        const conv = await this.prisma.conversation.findUnique({ where: { id: dto.conversationId }, select: { eventId: true } });
        if (!conv)
            throw new common_1.NotFoundException();
        await this.ensureEventMember(conv.eventId, actor.id, actor.isSuperAdmin);
        const isParticipant = await this.prisma.participant.findFirst({ where: { conversationId: dto.conversationId, userId: actor.id } });
        if (!isParticipant)
            throw new common_1.ForbiddenException('Not a participant');
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
        return msg;
    }
    async addReaction(dto, actor) {
        const msg = await this.prisma.message.findUnique({ where: { id: dto.messageId }, select: { conversationId: true } });
        if (!msg)
            throw new common_1.NotFoundException();
        const conv = await this.prisma.conversation.findUnique({ where: { id: msg.conversationId }, select: { eventId: true } });
        if (!conv)
            throw new common_1.NotFoundException();
        await this.ensureEventMember(conv.eventId, actor.id, actor.isSuperAdmin);
        try {
            const r = await this.prisma.reaction.create({ data: { messageId: dto.messageId, userId: actor.id, emoji: dto.emoji } });
            return { action: 'added', id: r.id };
        }
        catch {
            await this.prisma.reaction.delete({ where: { messageId_userId_emoji: { messageId: dto.messageId, userId: actor.id, emoji: dto.emoji } } });
            return { action: 'removed' };
        }
    }
    async markRead(dto, actor) {
        const conv = await this.prisma.conversation.findUnique({ where: { id: dto.conversationId }, select: { eventId: true } });
        if (!conv)
            throw new common_1.NotFoundException();
        await this.ensureEventMember(conv.eventId, actor.id, actor.isSuperAdmin);
        await this.ensureParticipant(dto.conversationId, actor.id);
        const now = new Date();
        await this.prisma.participant.update({
            where: { conversationId_userId: { conversationId: dto.conversationId, userId: actor.id } },
            data: { lastReadAt: now },
        });
        return { ok: true, at: now.toISOString() };
    }
    async ensureParticipant(conversationId, userId) {
        const p = await this.prisma.participant.findFirst({ where: { conversationId, userId } });
        if (!p)
            throw new common_1.ForbiddenException('Not a participant');
        return p;
    }
    async addParticipants(conversationId, userIds, actor) {
        await this.ensureParticipant(conversationId, actor.id);
        const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { eventId: true, kind: true, participants: { where: { userId: actor.id }, select: { role: true } } } });
        if (!conv)
            throw new common_1.NotFoundException();
        if (conv.kind === 'GROUP') {
            const myRole = conv.participants?.[0]?.role || 'MEMBER';
            if (myRole !== 'OWNER')
                throw new common_1.ForbiddenException('Only the group creator can add members');
        }
        const rows = await this.prisma.eventMembership.findMany({ where: { eventId: conv.eventId, userId: { in: userIds } }, select: { userId: true } });
        const validIds = new Set(rows.map(r => r.userId));
        const toAdd = userIds.filter(id => validIds.has(id));
        if (!toAdd.length)
            return { added: 0 };
        await this.prisma.$transaction(toAdd.map(uid => this.prisma.participant.upsert({ where: { conversationId_userId: { conversationId, userId: uid } }, update: {}, create: { conversationId, userId: uid, role: 'MEMBER' } })));
        const users = await this.prisma.user.findMany({ where: { id: { in: toAdd } }, select: { fullName: true, email: true } });
        const names = users.map(u => u.fullName || u.email).join(', ');
        const m = await this.prisma.message.create({ data: { conversationId, authorId: actor.id, body: `added ${names}` }, select: { id: true } });
        await this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
        return { added: toAdd.length, messageId: m.id };
    }
    async removeParticipant(conversationId, userId, actor) {
        await this.ensureParticipant(conversationId, actor.id);
        const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { kind: true, participants: { select: { userId: true, role: true } } } });
        if (!conv)
            throw new common_1.NotFoundException();
        if (conv.kind !== 'GROUP')
            throw new common_1.ForbiddenException('Not allowed');
        const me = conv.participants.find((p) => p.userId === actor.id);
        if (!me)
            throw new common_1.ForbiddenException('Not in group');
        const isSelf = userId === actor.id;
        if (!isSelf && me.role !== 'OWNER')
            throw new common_1.ForbiddenException('Only the group creator can remove members');
        const target = conv.participants.find((p) => p.userId === userId);
        if (!target)
            return { ok: true };
        if (!isSelf && target.role === 'OWNER')
            throw new common_1.ForbiddenException('Cannot remove the owner');
        await this.prisma.participant.delete({ where: { conversationId_userId: { conversationId, userId } } });
        const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } });
        const m = await this.prisma.message.create({ data: { conversationId, authorId: actor.id, body: `removed ${u?.fullName || u?.email || userId}` }, select: { id: true } });
        await this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
        return { ok: true, messageId: m.id };
    }
    async updateParticipantRole(conversationId, userId, role, actor) {
        await this.ensureParticipant(conversationId, actor.id);
        const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId }, select: { kind: true, participants: { select: { userId: true, role: true } } } });
        if (!conv)
            throw new common_1.NotFoundException();
        if (conv.kind !== 'GROUP')
            throw new common_1.ForbiddenException('Not allowed');
        const me = conv.participants.find((p) => p.userId === actor.id);
        if (!me || me.role !== 'OWNER')
            throw new common_1.ForbiddenException('Only the group creator can manage roles');
        if (!role || (role !== 'MEMBER' && role !== 'OWNER'))
            throw new common_1.BadRequestException('Invalid role');
        if (role === 'OWNER') {
            await this.prisma.$transaction([
                this.prisma.participant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { role: 'OWNER' } }),
                this.prisma.participant.update({ where: { conversationId_userId: { conversationId, userId: actor.id } }, data: { role: 'MEMBER' } }),
            ]);
        }
        else {
            await this.prisma.participant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { role: 'MEMBER' } });
        }
        return { ok: true };
    }
    async listParticipants(conversationId, actor) {
        await this.ensureParticipant(conversationId, actor.id);
        return this.prisma.participant.findMany({ where: { conversationId }, select: { userId: true, role: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } } } });
    }
    async getOrCreateDirect(eventId, otherUserId, actor) {
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
        if (existing)
            return existing;
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
    async listMessages(conversationId, actor, limit = 50, before) {
        await this.ensureParticipant(conversationId, actor.id);
        const where = { conversationId };
        if (before)
            where.createdAt = { lt: new Date(before) };
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
        let attsByMsg = {};
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
    async messageReaders(messageId, actor) {
        const msg = await this.prisma.message.findUnique({ where: { id: messageId }, select: { id: true, conversationId: true, createdAt: true } });
        if (!msg)
            throw new common_1.NotFoundException('Message not found');
        await this.ensureParticipant(msg.conversationId, actor.id);
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
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map