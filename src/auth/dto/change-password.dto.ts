import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsString() @IsEmail() email: string;
  @IsString() @IsNotEmpty() token: string;
  @IsString() @IsNotEmpty() password: string;
}
