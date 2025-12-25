// src/departments/dto/update-dept-member.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateDeptMemberDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() note?: string;
}
