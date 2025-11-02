import { IsString } from 'class-validator';

export class ReactDto {
  @IsString()
  messageId!: string;

  @IsString()
  emoji!: string; // e.g., :thumbsup: or unicode
}

