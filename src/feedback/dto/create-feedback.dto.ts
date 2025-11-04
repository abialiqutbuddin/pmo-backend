import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() description!: string;
  @IsOptional() @IsISO8601() dateOccurred?: string;
  @IsOptional() @IsString() venueId?: string;
}

