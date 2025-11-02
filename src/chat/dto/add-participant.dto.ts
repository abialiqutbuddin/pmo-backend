import { IsArray, IsString } from 'class-validator';

export class AddParticipantDto {
  @IsString()
  conversationId!: string;

  @IsArray()
  userIds!: string[];
}

