import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { UserRoles } from 'src/common/constants/enum';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty()
  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-_]).{8,}$/, {
    message:
      'Password must have at least one upper case, at least one lower case English letter, at least one digit, at least one special character',
  })
  password?: string;

  @ApiProperty()
  @IsString()
  @IsEnum(UserRoles)
  role?: string;
}
