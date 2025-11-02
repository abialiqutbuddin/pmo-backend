import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class ChangeTaskStatusDto {
  @IsEnum(TaskStatus) status!: TaskStatus;
  @IsOptional() @IsInt() progressPct?: number; // 0..100, optional
}
