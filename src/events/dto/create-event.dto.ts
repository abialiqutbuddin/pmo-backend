// src/events/dto/create-event.dto.ts
import { IsArray, IsOptional, IsString, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EventRole } from '@prisma/client';

export class SeedMemberDto {
  @IsString() userId!: string;
  @IsEnum(EventRole) role!: EventRole; // e.g., DEPT_HEAD, DEPT_MEMBER, OBSERVER, PMO_POC (non-dept)
}

export class SeedDepartmentDto {
  @IsString() name!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SeedMemberDto)
  members?: SeedMemberDto[];
}

export class CreateEventDto {
  @IsString() name!: string;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;

  // optional: bootstrap depts + assignments
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SeedDepartmentDto)
  departments?: SeedDepartmentDto[];
}
