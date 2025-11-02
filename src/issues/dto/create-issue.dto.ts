import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IssueSeverity } from '@prisma/client';

export class CreateIssueDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(IssueSeverity) severity?: IssueSeverity;
}
