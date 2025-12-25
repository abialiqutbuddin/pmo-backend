import { Controller, Post, Body, UseGuards, ForbiddenException, Req, Get } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
    constructor(private readonly service: TenantService) { }

    @Post()
    create(@Req() req: any, @Body() dto: CreateTenantDto) {
        if (!req.user?.isSuperAdmin) throw new ForbiddenException('Only Super Admin can create tenants');
        return this.service.create(dto);
    }

    @Get()
    findAll(@Req() req: any) {
        if (!req.user?.isSuperAdmin) throw new ForbiddenException('Only Super Admin can list tenants');
        return this.service.findAll();
    }
}
