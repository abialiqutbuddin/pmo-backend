import { IsBoolean, IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() @MinLength(6) password?: string;

  // only super-admin can set this; ignored otherwise
  @IsOptional() @IsBoolean() isSuperAdmin?: boolean;

  // allow disabling accounts (super-admin only)
  @IsOptional() @IsBoolean() isDisabled?: boolean;

  // profile fields
  @IsOptional() @IsString() @MinLength(1) @MaxLength(8) itsId?: string;
  @IsOptional() @IsString() profileImage?: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() phoneNumber?: string;
}
