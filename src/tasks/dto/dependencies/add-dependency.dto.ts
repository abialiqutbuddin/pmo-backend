import { IsEnum, IsString } from 'class-validator';
import { DependencyType } from '@prisma/client';

export class AddDependencyDto {
  @IsString() upstreamId!: string; // task that blocks the current task (downstream)
  @IsEnum(DependencyType) depType: DependencyType = DependencyType.finish_to_start;
}

