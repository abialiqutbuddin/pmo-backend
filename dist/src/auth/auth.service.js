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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const argon2 = __importStar(require("argon2"));
const date_fns_1 = require("date-fns");
function requiredEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing required env var: ${name}`);
    return v;
}
function ttlToSeconds(ttl = '900s') {
    const m = ttl.match(/^(\d+)([smhd])$/);
    if (!m)
        return 900;
    const n = parseInt(m[1], 10);
    const u = m[2];
    return u === 's' ? n : u === 'm' ? n * 60 : u === 'h' ? n * 3600 : n * 86400;
}
const ACCESS_TTL_SEC = ttlToSeconds(process.env.ACCESS_TOKEN_TTL ?? '900s');
const REFRESH_TTL_SEC = ttlToSeconds(process.env.REFRESH_TOKEN_TTL ?? '30d');
let AuthService = class AuthService {
    prisma;
    jwt;
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async login(dto, ua, ip) {
        const user = await this.validateUser(dto.email, dto.password);
        const accessToken = await this.signAccessToken(user);
        const { token: refreshToken, tokenHash, expiresAt } = await this.signRefreshToken(user);
        await this.prisma.sessionToken.create({
            data: {
                userId: user.id,
                tokenHash,
                userAgent: ua,
                ip,
                expiresAt,
            },
        });
        return { accessToken, refreshToken };
    }
    async refresh(dto, ua, ip) {
        let decoded;
        try {
            decoded = await this.jwt.verifyAsync(dto.refreshToken, {
                secret: requiredEnv('JWT_REFRESH_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const userId = decoded?.sub;
        if (!userId)
            throw new common_1.UnauthorizedException('Invalid refresh token');
        const sessions = await this.prisma.sessionToken.findMany({
            where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { issuedAt: 'desc' },
            take: 25,
        });
        const matching = await this.findMatchingSession(dto.refreshToken, sessions);
        if (!matching)
            throw new common_1.UnauthorizedException('Refresh session not found');
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.isDisabled)
            throw new common_1.ForbiddenException('User disabled');
        const accessToken = await this.signAccessToken(user);
        const { token: newRefreshToken, tokenHash: newTokenHash, expiresAt } = await this.signRefreshToken(user);
        await this.prisma.$transaction([
            this.prisma.sessionToken.update({
                where: { id: matching.id },
                data: { revokedAt: new Date() },
            }),
            this.prisma.sessionToken.create({
                data: {
                    userId: user.id,
                    tokenHash: newTokenHash,
                    userAgent: ua,
                    ip,
                    expiresAt,
                },
            }),
        ]);
        return { accessToken, refreshToken: newRefreshToken };
    }
    async logout(userId, refreshToken, all) {
        if (!userId)
            return;
        if (all) {
            await this.prisma.sessionToken.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            return;
        }
        if (!refreshToken)
            return;
        const sessions = await this.prisma.sessionToken.findMany({
            where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { issuedAt: 'desc' },
            take: 25,
        });
        const matching = await this.findMatchingSession(refreshToken, sessions);
        if (matching) {
            await this.prisma.sessionToken.update({
                where: { id: matching.id },
                data: { revokedAt: new Date() },
            });
        }
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || user.isDisabled)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await argon2.verify(user.passwordHash, password);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return user;
    }
    async signAccessToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            isSuperAdmin: !!user.isSuperAdmin,
        };
        return this.jwt.signAsync(payload, {
            secret: requiredEnv('JWT_ACCESS_SECRET'),
            expiresIn: ACCESS_TTL_SEC,
            algorithm: 'HS256',
        });
    }
    async signRefreshToken(user) {
        const payload = { sub: user.id, typ: 'refresh' };
        const token = await this.jwt.signAsync(payload, {
            secret: requiredEnv('JWT_REFRESH_SECRET'),
            expiresIn: REFRESH_TTL_SEC,
            algorithm: 'HS256',
        });
        const tokenHash = await argon2.hash(token);
        const expiresAt = this.computeExpiryFromSeconds(REFRESH_TTL_SEC);
        return { token, tokenHash, expiresAt };
    }
    computeExpiryFromSeconds(seconds) {
        return (0, date_fns_1.add)(new Date(), { seconds });
    }
    async findMatchingSession(rawRefreshToken, sessions) {
        for (const s of sessions) {
            const match = await argon2.verify(s.tokenHash, rawRefreshToken).catch(() => false);
            if (match)
                return { id: s.id };
        }
        return null;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map