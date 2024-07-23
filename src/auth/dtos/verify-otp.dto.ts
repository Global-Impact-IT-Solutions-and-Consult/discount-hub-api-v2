import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsLowercase, IsNotEmpty, IsString } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty()
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @IsLowercase()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}
