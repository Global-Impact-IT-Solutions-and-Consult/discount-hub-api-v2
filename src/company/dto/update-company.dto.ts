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

  // @IsString()
  // apiKey?: string;

  // @IsOptional()
  // urls?: {
  //   links?: string[];
  //   special_links?: {
  //     name: string;
  //     urls: string[];
  //   }[];
  // };

  @IsOptional()
  special_links?: {
    name: string;
    urls: string[];
  }[];

  @IsString({ each: true })
  @IsOptional()
  urls?: string[];
}
