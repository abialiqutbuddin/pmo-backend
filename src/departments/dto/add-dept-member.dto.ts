// src/departments/dto/add-dept-member.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class AddDeptMemberDto {
  @IsString() userId!: string;
  @IsOptional() @IsString() role?: string; // e.g. "DEPT_HEAD" tag if we use it, or just "Member"
  @IsOptional() @IsString() note?: string;
}
