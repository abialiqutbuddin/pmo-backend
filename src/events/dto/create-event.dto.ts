// src/events/dto/create-event.dto.ts
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';


export class SeedMemberDto {
  @IsString() userId!: string;
  @IsOptional() @IsString() role?: string;
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
  @IsOptional() @IsString() structure?: 'ZONAL' | 'HIERARCHICAL';

  // optional: bootstrap depts + assignments
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SeedDepartmentDto)
  departments?: SeedDepartmentDto[];
}
