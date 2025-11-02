import { IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  conversationId!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  parentId?: string; // for threads
}

