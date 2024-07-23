import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString() @IsNotEmpty() emailOrUsername: string;
  @IsString()
  @Matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
  password: string;
}
