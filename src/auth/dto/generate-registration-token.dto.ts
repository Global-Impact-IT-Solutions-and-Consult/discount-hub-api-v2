import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRolesEnum } from 'src/utils/constants';

export class GenerateRegistrationTokenDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(UserRolesEnum)
  use: UserRolesEnum;
}
