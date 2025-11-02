import { IsOptional, IsString } from 'class-validator';

export class CreateTaskFromMessageDto {
  @IsString()
  eventId!: string;

  @IsString()
  conversationId!: string;

  @IsString()
  messageId!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  title?: string; // fallback to message body if absent
}

