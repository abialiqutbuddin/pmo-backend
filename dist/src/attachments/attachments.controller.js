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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const event_guard_1 = require("../common/guards/event.guard");
const attachments_service_1 = require("./attachments.service");
const express_1 = __importDefault(require("express"));
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AttachmentsController = class AttachmentsController {
    attachments;
    constructor(attachments) {
        this.attachments = attachments;
    }
    async upload(eventId, file, entityType, entityId, user) {
        return this.attachments.uploadAttachment(file.buffer, file.originalname, entityType, entityId, eventId, user.sub);
    }
    async download(id, res) {
        const path = await this.attachments.resolvePath(id);
        res.setHeader('X-Accel-Redirect', `/protected/${path}`);
        res.status(200).end();
    }
    async list(eventId, entityType, entityId) {
        if (!entityType || !entityId) {
            throw new common_1.BadRequestException('entityType and entityId are required');
        }
        return this.attachments.listForEntity({ eventId, entityType, entityId });
    }
    async remove(eventId, id) {
        return this.attachments.deleteForEvent(eventId, id);
    }
};
exports.AttachmentsController = AttachmentsController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 50 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('entityType')),
    __param(3, (0, common_1.Body)('entityId')),
    __param(4, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "download", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Query)('entityType')),
    __param(2, (0, common_1.Query)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "list", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "remove", null);
exports.AttachmentsController = AttachmentsController = __decorate([
    (0, common_1.Controller)('events/:eventId/attachments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard),
    __metadata("design:paramtypes", [attachments_service_1.AttachmentsService])
], AttachmentsController);
//# sourceMappingURL=attachments.controller.js.map