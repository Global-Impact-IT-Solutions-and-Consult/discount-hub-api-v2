import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateConfirmEmailToken {
  @IsString() @IsNotEmpty() email: string;
}
