import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Company } from '../schemas/company.schema';

export class CreateCompanyDto implements Partial<Company> {
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
  @IsOptional()
  adminId?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  badgeColor: string;

  // @IsString()
  // apiKey: string;

  // @IsOptional()
  // urls?: {
  //   links?: string[];
  //   special_links?: {
  //     name: string;
  //     urls: string[];
  //   }[];
  // };

  @IsOptional({ each: true })
  special_links?: Array<{
    name: string;
    urls: string[];
  }>;

  @IsString({ each: true })
  @IsOptional()
  urls?: string[];
}
