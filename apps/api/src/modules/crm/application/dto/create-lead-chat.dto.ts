import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadChatDto {
  @ApiProperty({ description: 'Chat message content' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
