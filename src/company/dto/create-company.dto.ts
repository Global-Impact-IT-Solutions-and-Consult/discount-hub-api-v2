import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsMongoId()
  adminId: string;

  @IsString()
  website: string;

  @IsString({ each: true })
  urls: string[];
}
