import { IsISO8601, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTaskDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) priority?: number; // 1=highest
  @IsOptional() @IsIn(['issue', 'new_task', 'taujeeh', 'improvement']) type?: string;
  @IsOptional() @IsISO8601() startAt?: string;
  @IsOptional() @IsISO8601() dueAt?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() venueId?: string;
  @IsOptional() @IsString() zoneId?: string;
  // When set, must be a ZoneZonalDepartment.id
  @IsOptional() @IsString() zonalDeptRowId?: string;
  @IsOptional() @IsIn(['todo', 'in_progress', 'blocked', 'done', 'canceled']) status?: string;
}
