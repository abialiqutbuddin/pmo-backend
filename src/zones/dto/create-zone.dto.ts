import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

