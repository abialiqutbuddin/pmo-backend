import { IsOptional, IsString } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional() @IsString() roleId?: string;
  @IsOptional() @IsString() departmentId?: string | null;
}
