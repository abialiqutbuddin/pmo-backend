import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EventRole } from '@prisma/client';

export class UpdateMemberDto {
  @IsEnum(EventRole) role!: EventRole;
  @IsOptional() @IsString() departmentId?: string | null;
}
