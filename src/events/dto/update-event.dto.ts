import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateEventDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsString() archivedAt?: string; // ISO to archive
  @IsOptional() @IsString() structure?: 'ZONAL' | 'HIERARCHICAL';
  @IsOptional() @IsBoolean() zonesEnabled?: boolean;
}
