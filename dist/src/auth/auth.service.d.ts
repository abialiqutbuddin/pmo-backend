import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TokenPair } from './types';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    login(dto: LoginDto, ua?: string, ip?: string): Promise<TokenPair>;
    refresh(dto: RefreshDto, ua?: string, ip?: string): Promise<TokenPair>;
    logout(userId: string, refreshToken?: string, all?: boolean): Promise<void>;
    private validateUser;
    private signAccessToken;
    private signRefreshToken;
    private computeExpiryFromSeconds;
    private findMatchingSession;
}
