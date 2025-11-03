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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const argon2 = __importStar(require("argon2"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, actor) {
        const passwordHash = await argon2.hash(dto.itsId);
        return this.prisma.user.create({
            data: {
                email: dto.email,
                fullName: dto.fullName,
                itsId: dto.itsId,
                profileImage: dto.profileImage,
                organization: dto.organization,
                designation: dto.designation,
                phoneNumber: dto.phoneNumber,
                passwordHash,
                isDisabled: actor.isSuperAdmin ? !!dto.isDisabled : false,
                isSuperAdmin: actor.isSuperAdmin ? !!dto.isSuperAdmin : false,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                isDisabled: true,
                isSuperAdmin: true,
                createdAt: true,
                itsId: true,
                profileImage: true,
                organization: true,
                designation: true,
                phoneNumber: true,
            },
        });
    }
    async list(actor) {
        if (!actor.isSuperAdmin)
            throw new common_1.ForbiddenException();
        return this.prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                fullName: true,
                isDisabled: true,
                isSuperAdmin: true,
                createdAt: true,
                itsId: true,
                profileImage: true,
                organization: true,
                designation: true,
                phoneNumber: true,
            },
        });
    }
    async get(id, actor) {
        if (!actor.isSuperAdmin && actor.id !== id)
            throw new common_1.ForbiddenException();
        const u = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                fullName: true,
                isDisabled: true,
                isSuperAdmin: true,
                createdAt: true,
                itsId: true,
                profileImage: true,
                organization: true,
                designation: true,
                phoneNumber: true,
            },
        });
        if (!u)
            throw new common_1.NotFoundException();
        return u;
    }
    async update(id, dto, actor) {
        const isSelf = actor.id === id;
        if (!actor.isSuperAdmin) {
            if (!isSelf)
                throw new common_1.ForbiddenException();
            delete dto.isSuperAdmin;
            delete dto.isDisabled;
        }
        let passwordHash;
        if (dto.password)
            passwordHash = await argon2.hash(dto.password);
        return this.prisma.user.update({
            where: { id },
            data: {
                email: dto.email,
                fullName: dto.fullName,
                ...(passwordHash ? { passwordHash } : {}),
                itsId: dto.itsId,
                profileImage: dto.profileImage,
                organization: dto.organization,
                designation: dto.designation,
                phoneNumber: dto.phoneNumber,
                ...(actor.isSuperAdmin && dto.isSuperAdmin !== undefined ? { isSuperAdmin: !!dto.isSuperAdmin } : {}),
                ...(actor.isSuperAdmin && dto.isDisabled !== undefined ? { isDisabled: !!dto.isDisabled } : {}),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                isDisabled: true,
                isSuperAdmin: true,
                createdAt: true,
                itsId: true,
                profileImage: true,
                organization: true,
                designation: true,
                phoneNumber: true,
            },
        });
    }
    async delete(id, actor) {
        if (!actor.isSuperAdmin)
            throw new common_1.ForbiddenException();
        await this.prisma.user.delete({ where: { id } });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map