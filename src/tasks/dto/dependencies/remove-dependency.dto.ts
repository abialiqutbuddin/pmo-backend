import { IsString } from 'class-validator';

export class RemoveDependencyDto {
  @IsString() upstreamId!: string;
}

