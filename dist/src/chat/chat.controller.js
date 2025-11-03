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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_conversation_dto_1 = require("./dto/create-conversation.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const react_dto_1 = require("./dto/react.dto");
const mark_read_dto_1 = require("./dto/mark-read.dto");
const create_task_from_message_dto_1 = require("./dto/create-task-from-message.dto");
const prisma_service_1 = require("../prisma/prisma.service");
const add_participant_dto_1 = require("./dto/add-participant.dto");
const chat_gateway_1 = require("./chat.gateway");
let ChatController = class ChatController {
    chat;
    prisma;
    gateway;
    constructor(chat, prisma, gateway) {
        this.chat = chat;
        this.prisma = prisma;
        this.gateway = gateway;
    }
    createConv(user, dto) {
        return this.chat.createConversation(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    list(eventId, user) {
        return this.chat.listConversations(eventId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    send(user, dto) {
        return this.chat.sendMessage(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    react(user, dto) {
        return this.chat.addReaction(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    read(user, dto) {
        return this.chat.markRead(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    async createTaskFromMessage(user, dto) {
        const msg = await this.prisma.message.findUnique({ where: { id: dto.messageId }, select: { body: true, conversationId: true } });
        if (!msg)
            return { error: 'Message not found' };
        const title = (dto.title || msg.body || 'New Task').slice(0, 120);
        const data = {
            eventId: dto.eventId,
            creatorId: user.sub,
            title,
            description: `Created from message ${dto.messageId} in conversation ${msg.conversationId}`,
            priority: 3,
            status: 'todo',
        };
        if (dto.departmentId)
            data.departmentId = dto.departmentId;
        const task = await this.prisma.task.create({ data, select: { id: true, title: true, status: true, departmentId: true } });
        return task;
    }
    createDirect(user, body) {
        return this.chat.getOrCreateDirect(body.eventId, body.userId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    listParticipants(conversationId, user) {
        return this.chat.listParticipants(conversationId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    addParticipants(conversationId, dto, user) {
        const ids = dto.userIds || [];
        return this.chat.addParticipants(conversationId, ids, { id: user.sub, isSuperAdmin: user.isSuperAdmin }).then(async (res) => {
            if (res?.messageId) {
                const msg = await this.prisma.message.findUnique({ where: { id: res.messageId }, select: { id: true, conversationId: true, authorId: true, body: true, parentId: true, createdAt: true, author: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } } } });
                if (msg)
                    this.gateway.server.to(`conv:${conversationId}`).emit('message.new', { ...msg, isSystem: true });
            }
            this.gateway.server.to(`conv:${conversationId}`).emit('participants.updated', { conversationId });
            try {
                const conv = await this.prisma.conversation.findUnique({
                    where: { id: conversationId },
                    select: {
                        id: true,
                        kind: true,
                        title: true,
                        departmentId: true,
                        issueId: true,
                        updatedAt: true,
                        participants: { select: { userId: true, lastReadAt: true, user: { select: { id: true, fullName: true, email: true } } } },
                        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, authorId: true, body: true, createdAt: true, author: { select: { id: true, fullName: true, email: true } } } },
                    },
                });
                if (conv) {
                    const payload = {
                        id: conv.id,
                        kind: conv.kind,
                        title: conv.title,
                        departmentId: conv.departmentId,
                        issueId: conv.issueId,
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
            }
            catch { }
            return res;
        });
    }
    listMessages(conversationId, user, limit, before) {
        const n = Math.max(1, Math.min(200, parseInt(limit || '50', 10)));
        const b = before && before !== 'null' && before !== 'undefined' ? before : undefined;
        return this.chat.listMessages(conversationId, { id: user.sub, isSuperAdmin: user.isSuperAdmin }, n, b);
    }
    readers(messageId, user) {
        return this.chat.messageReaders(messageId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    async removeParticipant(conversationId, userId, user) {
        const res = await this.chat.removeParticipant(conversationId, userId, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
        if (res?.messageId) {
            const msg = await this.prisma.message.findUnique({ where: { id: res.messageId }, select: { id: true, conversationId: true, authorId: true, body: true, parentId: true, createdAt: true, author: { select: { id: true, fullName: true, email: true, itsId: true, profileImage: true } } } });
            if (msg)
                this.gateway.server.to(`conv:${conversationId}`).emit('message.new', { ...msg, isSystem: true });
        }
        this.gateway.server.to(`conv:${conversationId}`).emit('participants.updated', { conversationId });
        await this.gateway.kickFromConversation(conversationId, userId);
        return res;
    }
    async updateParticipant(conversationId, userId, body, user) {
        const r = await this.chat.updateParticipantRole(conversationId, userId, body?.role, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
        this.gateway.server.to(`conv:${conversationId}`).emit('participants.updated', { conversationId });
        return r;
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('conversations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_conversation_dto_1.CreateConversationDto]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "createConv", null);
__decorate([
    (0, common_1.Get)('events/:eventId/conversations'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('messages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, send_message_dto_1.SendMessageDto]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "send", null);
__decorate([
    (0, common_1.Post)('react'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, react_dto_1.ReactDto]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "react", null);
__decorate([
    (0, common_1.Patch)('read'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mark_read_dto_1.MarkReadDto]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "read", null);
__decorate([
    (0, common_1.Post)('create-task-from-message'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_task_from_message_dto_1.CreateTaskFromMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createTaskFromMessage", null);
__decorate([
    (0, common_1.Post)('direct'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "createDirect", null);
__decorate([
    (0, common_1.Get)('conversations/:conversationId/participants'),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "listParticipants", null);
__decorate([
    (0, common_1.Post)('conversations/:conversationId/participants'),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_participant_dto_1.AddParticipantDto, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "addParticipants", null);
__decorate([
    (0, common_1.Get)('conversations/:conversationId/messages'),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('before')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "listMessages", null);
__decorate([
    (0, common_1.Get)('messages/:messageId/readers'),
    __param(0, (0, common_1.Param)('messageId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "readers", null);
__decorate([
    (0, common_1.Delete)('conversations/:conversationId/participants/:userId'),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "removeParticipant", null);
__decorate([
    (0, common_1.Patch)('conversations/:conversationId/participants/:userId'),
    __param(0, (0, common_1.Param)('conversationId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateParticipant", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService, prisma_service_1.PrismaService, chat_gateway_1.ChatGateway])
], ChatController);
//# sourceMappingURL=chat.controller.js.map