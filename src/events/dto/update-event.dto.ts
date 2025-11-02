import { IsOptional, IsString } from 'class-validator';

export class UpdateEventDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsString() archivedAt?: string; // ISO to archive
}
