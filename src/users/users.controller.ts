import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.users.create(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }
// @Post()
// create(@CurrentUser() user: any | null, @Body() dto: CreateUserDto) {
//   const actor = { id: user?.sub ?? null, isSuperAdmin: !!user?.isSuperAdmin };
//   return this.users.create(dto, actor); // service must tolerate null id
// }

  @Get()
  list(@CurrentUser() user: any) {
    return this.users.list({ isSuperAdmin: user.isSuperAdmin });
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.users.get(id, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.users.update(id, dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.users.delete(id, { isSuperAdmin: user.isSuperAdmin });
    return { ok: true };
  }
}
