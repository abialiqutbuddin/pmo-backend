import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ConversationKind } from '@prisma/client';

export class CreateConversationDto {
  @IsString()
  eventId!: string;

  @IsEnum(ConversationKind)
  kind!: ConversationKind;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;


  @IsOptional()
  @IsArray()
  participantUserIds?: string[]; // for GROUP/DIRECT
}
