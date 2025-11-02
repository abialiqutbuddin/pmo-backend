// src/departments/dto/add-dept-member.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EventRole } from '@prisma/client';

export class AddDeptMemberDto {
  @IsString() userId!: string;
  @IsEnum(EventRole) role!: EventRole; // must be DEPT_HEAD | DEPT_MEMBER | OBSERVER
  // departmentId comes from route; no need here
  @IsOptional() @IsString() note?: string; // optional
}
