import { IsString } from 'class-validator';

export class RemoveDependencyDto {
  @IsString() blockerId!: string;
}

