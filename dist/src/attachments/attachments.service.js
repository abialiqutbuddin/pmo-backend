"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const file_type_1 = require("file-type");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
let AttachmentsService = class AttachmentsService {
    prisma;
    root = process.env.ATTACH_ROOT || './uploads';
    maxBytes = (parseInt(process.env.MAX_UPLOAD_MB || '50', 10)) * 1024 * 1024;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async uploadAttachment(buffer, originalName, entityType, entityId, eventId, userId) {
        if (!buffer?.length)
            throw new common_1.BadRequestException('Empty file');
        if (buffer.length > this.maxBytes)
            throw new common_1.BadRequestException('File exceeds upload limit');
        if (!entityType || !entityId || !eventId)
            throw new common_1.BadRequestException('Missing required fields');
        const ft = await (0, file_type_1.fileTypeFromBuffer)(buffer);
        const mimeType = ft?.mime || 'application/octet-stream';
        const checksum = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
        const cleanName = (originalName || 'file').replace(/\s+/g, '-').toLowerCase();
        const id = (0, crypto_1.randomUUID)();
        const objectKey = path.posix.join('attachments', eventId, entityType.toLowerCase(), entityId, id, cleanName);
        const diskPath = path.join(this.root, objectKey);
        await fs.mkdir(path.dirname(diskPath), { recursive: true });
        try {
            await fs.writeFile(diskPath, buffer);
        }
        catch {
            throw new common_1.BadRequestException('Failed to write file');
        }
        try {
            const att = await this.prisma.attachment.create({
                data: {
                    id,
                    eventId,
                    entityType,
                    entityId,
                    objectKey,
                    originalName,
                    mimeType,
                    size: buffer.length,
                    checksum,
                    provider: client_1.StorageProvider.filesystem,
                    createdBy: userId,
                },
                select: { id: true, objectKey: true, mimeType: true },
            });
            await this.prisma.attachmentLink.create({
                data: {
                    attachmentId: id,
                    entityType,
                    entityId,
                },
            }).catch(() => { });
            return att;
        }
        catch (e) {
            await fs.rm(diskPath, { force: true }).catch(() => { });
            if (e?.code === 'P2002') {
                throw new common_1.BadRequestException('Duplicate attachment key');
            }
            throw e;
        }
    }
    async resolvePath(id) {
        const att = await this.prisma.attachment.findUnique({
            where: { id },
            select: { objectKey: true, deletedAt: true },
        });
        if (!att || att.deletedAt)
            throw new common_1.NotFoundException('Attachment not found');
        return att.objectKey;
    }
    async listForEntity(input) {
        const { eventId, entityType, entityId } = input;
        return this.prisma.attachment.findMany({
            where: {
                links: {
                    some: {
                        entityType,
                        entityId,
                    },
                },
            },
            select: {
                id: true,
                originalName: true,
                mimeType: true,
                size: true,
                createdAt: true,
                objectKey: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async delete(id, alsoRemoveFile = false) {
        const att = await this.prisma.attachment.update({
            where: { id },
            data: { deletedAt: new Date() },
            select: { objectKey: true },
        });
        if (alsoRemoveFile) {
            const diskPath = path.join(this.root, att.objectKey);
            await fs.rm(diskPath, { force: true }).catch(() => { });
        }
        return { ok: true };
    }
};
exports.AttachmentsService = AttachmentsService;
exports.AttachmentsService = AttachmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttachmentsService);
//# sourceMappingURL=attachments.service.js.map