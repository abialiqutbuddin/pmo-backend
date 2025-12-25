// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    JwtModule.register({}) // secrets injected in service
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtAccessStrategy, PermissionsService],
  exports: [AuthService, PermissionsService],
})
export class AuthModule { }
