import { IsString, IsArray, IsDateString, ArrayMinSize, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendScoreboardEmailDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: ['admin@ecoloop.us'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  recipients: string[];
}
