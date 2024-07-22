import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsMongoId()
  adminId: string;

  @IsString()
  website: string;

  @IsString({ each: true })
  urls: string[];
}
