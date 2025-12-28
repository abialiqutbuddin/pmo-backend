import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) { }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    // create(dto, tenantId, actor)
    return this.users.create(dto, user.tenantId, { id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager, tenantId: user.tenantId });
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.users.list({ id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager, tenantId: user.tenantId });
  }

  @Get('me')
  getCurrent(@CurrentUser() user: any) {
    return this.users.get(user.sub, { id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager, tenantId: user.tenantId });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.users.get(id, { id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager, tenantId: user.tenantId });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.users.update(id, dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager, tenantId: user.tenantId });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.users.delete(id, { id: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager, tenantId: user.tenantId });
    return { ok: true };
  }
}
