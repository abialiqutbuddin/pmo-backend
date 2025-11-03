import { IsISO8601, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTaskDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) priority?: number; // 1=highest
  @IsOptional() @IsIn(['issue','new_task','taujeeh','improvement']) type?: string;
  @IsOptional() @IsISO8601() startAt?: string;
  @IsOptional() @IsISO8601() dueAt?: string;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsString() venueId?: string;
}
