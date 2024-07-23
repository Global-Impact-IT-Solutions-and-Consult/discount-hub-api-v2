import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
} from 'class-validator';

export class ResendOtpDto {
  @ApiProperty()
  @IsString()
  @IsEmail()
  email: string;
}
