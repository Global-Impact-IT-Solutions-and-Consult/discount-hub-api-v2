import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmEmailDto {
  @IsString() @IsNotEmpty() token: string;
  @IsEmail() email: string;
}
