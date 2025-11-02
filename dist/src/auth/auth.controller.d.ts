import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(req: any, dto: LoginDto): Promise<import("./types").TokenPair>;
    refresh(req: any, dto: RefreshDto): Promise<import("./types").TokenPair>;
    logout(req: any, body: {
        refreshToken?: string;
        all?: boolean;
    }): Promise<void>;
    private extractUserIdFromRefresh;
}
