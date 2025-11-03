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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const chat_service_1 = require("./chat.service");
const prisma_service_1 = require("../prisma/prisma.service");
let ChatGateway = ChatGateway_1 = class ChatGateway {
    jwt;
    chat;
    prisma;
    server;
    logger = new common_1.Logger(ChatGateway_1.name);
    constructor(jwt, chat, prisma) {
        this.jwt = jwt;
        this.chat = chat;
        this.prisma = prisma;
    }
    async handleConnection(client) {
        try {
            const token = (client.handshake.auth?.token || client.handshake.headers['authorization'] || '').toString().replace(/^Bearer\s+/i, '');
            const eventId = (client.handshake.auth?.eventId || client.handshake.query['eventId']);
            if (!token || !eventId) {
                client.disconnect(true);
                return;
            }
            let payload;
            try {
                payload = this.jwt.verify(token, {
                    secret: process.env.JWT_ACCESS_SECRET,
                    algorithms: ['HS256'],
                });
            }
            catch (e) {
                client.disconnect(true);
                return;
            }
            if (!payload?.sub) {
                client.disconnect(true);
                return;
            }
            const user = { id: payload.sub, isSuperAdmin: !!payload.isSuperAdmin };
            await this.chat.ensureEventMember(eventId, user.id, user.isSuperAdmin);
            client.data.user = user;
            client.data.eventId = eventId;
            client.join(`event:${eventId}`);
            client.join(`user:${user.id}`);
            this.logger.log(`client ${user.id} connected to event ${eventId}`);
        }
        catch {
            client.disconnect(true);
        }
    }
    async handleDisconnect(client) {
        const { user, eventId } = client.data || {};
        if (user?.id && eventId)
            this.logger.log(`client ${user.id} disconnected from event ${eventId}`);
    }
    async onJoin(data, client) {
        try {
            const user = client.data.user;
            const p = await this.prisma.participant.findFirst({ where: { conversationId: data.conversationId, userId: user.id } });
            if (!p) {
                client.emit('conversation.join-denied', { conversationId: data.conversationId });
                return;
            }
            client.join(`conv:${data.conversationId}`);
        }
        catch (e) {
            try {
                client.emit('conversation.join-denied', { conversationId: data.conversationId });
            }
            catch { }
        }
    }
    async onLeave(data, client) {
        client.leave(`conv:${data.conversationId}`);
    }
    async onMessage(body, client) {
        const user = client.data.user;
        const msg = await this.chat.sendMessage({ ...body }, user);
        const payload = { ...msg, isSystem: false };
        this.server.to(`conv:${body.conversationId}`).emit('message.new', payload);
        return payload;
    }
    async kickFromConversation(conversationId, userId) {
        try {
            const room = `conv:${conversationId}`;
            const sockets = await this.server.in(room).fetchSockets();
            for (const s of sockets) {
                const u = s.data?.user?.id;
                if (u === userId) {
                    try {
                        s.leave(room);
                    }
                    catch { }
                    try {
                        s.emit('conversation.kicked', { conversationId });
                    }
                    catch { }
                }
            }
        }
        catch { }
    }
    async onAttachmentUploaded(body, client) {
        try {
            const user = client.data.user;
            const msg = await this.prisma.message.findUnique({ where: { id: body.messageId }, select: { id: true, conversationId: true } });
            if (!msg)
                return;
            await this.prisma.participant.findFirstOrThrow({ where: { conversationId: msg.conversationId, userId: user.id } });
            const links = await this.prisma.attachmentLink.findMany({
                where: { entityType: 'Message', entityId: msg.id },
                select: { attachment: { select: { id: true, originalName: true, mimeType: true, size: true, objectKey: true } } },
                orderBy: { createdAt: 'asc' },
            });
            const attachments = links.map((l) => ({ id: l.attachment.id, originalName: l.attachment.originalName, mimeType: l.attachment.mimeType, size: l.attachment.size, objectKey: l.attachment.objectKey }));
            this.server.to(`conv:${msg.conversationId}`).emit('message.attachment', { conversationId: msg.conversationId, messageId: msg.id, attachments });
            return { count: attachments.length };
        }
        catch { }
    }
    async onReact(body, client) {
        const user = client.data.user;
        const r = await this.chat.addReaction(body, user);
        this.server.emit('message.reaction', { messageId: body.messageId, userId: user.id, emoji: body.emoji, action: r.action });
        return r;
    }
    async onRead(body, client) {
        const user = client.data.user;
        const r = await this.chat.markRead(body, user);
        this.server.to(`conv:${body.conversationId}`).emit('conversation.read', { conversationId: body.conversationId, userId: user.id, at: r.at });
        return r;
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation.join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation.leave'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onLeave", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message.send'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('attachment.uploaded'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onAttachmentUploaded", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message.react'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onReact", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('conversation.read'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onRead", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/ws', cors: true }),
    __metadata("design:paramtypes", [jwt_1.JwtService, chat_service_1.ChatService, prisma_service_1.PrismaService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map