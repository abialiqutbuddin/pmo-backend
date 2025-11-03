import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

