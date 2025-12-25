import { IsBoolean, IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() fullName!: string;
  // ITS identifier used for initial password
  @IsString() @MinLength(1) @MaxLength(8) itsId!: string;

  // only super-admin can set this; ignored otherwise
  @IsOptional() @IsBoolean() isSuperAdmin?: boolean;

  // tenant manager flag - can be set by super admin or tenant manager
  @IsOptional() @IsBoolean() isTenantManager?: boolean;

  // optional profile fields
  @IsOptional() @IsString() profileImage?: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsBoolean() isDisabled?: boolean;

  // Optional: Assign to events on creation
  @IsOptional() eventIds?: string[];
  @IsOptional() @IsString() eventRoleId?: string;
}
