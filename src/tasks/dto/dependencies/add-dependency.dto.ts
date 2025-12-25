import { IsEnum, IsString } from 'class-validator';
import { DependencyType } from '@prisma/client';

export class AddDependencyDto {
  @IsString() blockerId!: string; // task that blocks the current task
}

