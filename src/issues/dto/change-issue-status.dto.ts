import { IsEnum } from 'class-validator';
import { IssueStatus } from '@prisma/client';

export class ChangeIssueStatusDto {
  @IsEnum(IssueStatus) status!: IssueStatus;
}
