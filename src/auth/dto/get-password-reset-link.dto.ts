import { IsEmail } from 'class-validator';

export class GetPasswordResetLinkDto {
  @IsEmail()
  email: string;
}
