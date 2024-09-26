import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsNotEmpty()
  slug?: string;

  @IsMongoId()
  adminId?: string;

  @IsString()
  website?: string;

  @IsString({ each: true })
  urls?: string[];
}
