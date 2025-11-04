import { IsISO8601, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) priority?: number;
  @IsOptional() @IsIn(['issue','new_task','taujeeh','improvement']) type?: string | null;
  @IsOptional() @IsISO8601() startAt?: string | null;
  @IsOptional() @IsISO8601() dueAt?: string | null;
  @IsOptional() @IsString() assigneeId?: string | null;
  @IsOptional() @IsString() venueId?: string | null;
  @IsOptional() @IsString() zoneId?: string | null;
  // When set, must be a ZoneZonalDepartment.id; null to clear
  @IsOptional() @IsString() zonalDeptRowId?: string | null;
}
