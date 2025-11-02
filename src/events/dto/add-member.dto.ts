import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EventRole } from '@prisma/client';

export class AddMemberDto {
  @IsString() userId!: string;
  @IsEnum(EventRole) role!: EventRole;
  @IsOptional() @IsString() departmentId?: string;
}
