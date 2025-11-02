// src/departments/dto/update-dept-member.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EventRole } from '@prisma/client';

export class UpdateDeptMemberDto {
  @IsEnum(EventRole) role!: EventRole; // stays dept-scoped
  @IsOptional() @IsString() note?: string;
}
