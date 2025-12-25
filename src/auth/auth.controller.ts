// src/auth/auth.controller.ts
import { Body, Controller, HttpCode, Post, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @Post('lookup')
  async lookup(@Body('email') email: string) {
    if (!email) throw new Error('Email required');
    return this.auth.lookupTenants(email);
  }

  @Post('login')
  async login(@Req() req: any, @Body() dto: LoginDto) {
    const ua = req.headers['user-agent'];
    const ip = (req.ip || req.connection?.remoteAddress || '').toString();
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      // Technically TenantMiddleware should catch this if configured correctly,
      // but if excluded, we might need error or default logic.
      // Assuming strict tenancy, throw error.
      throw new Error('Tenant ID missing in login request context.');
    }
    return this.auth.login(dto, tenantId, ua, ip);
  }

  @Post('refresh')
  async refresh(@Req() req: any, @Body() dto: RefreshDto) {
    const ua = req.headers['user-agent'];
    const ip = (req.ip || req.connection?.remoteAddress || '').toString();
    return this.auth.refresh(dto, ua, ip);
  }

  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: any, @Body() body: { refreshToken?: string; all?: boolean }) {
    // if access token is present you could also take req.user.sub here after JwtAuthGuard
    const userId = req.user?.sub ?? undefined;
    if (!userId && !body.refreshToken) return; // optional: silent
    const id = userId ?? (await this.extractUserIdFromRefresh(body.refreshToken!));
    await this.auth.logout(id, body.refreshToken, body.all);
  }

  private async extractUserIdFromRefresh(refresh: string): Promise<string> {
    // decode without verifying exp to get sub; safe enough for logout
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
    const decoded: any = jwt.decode(refresh);
    return decoded?.sub;
  }
}
