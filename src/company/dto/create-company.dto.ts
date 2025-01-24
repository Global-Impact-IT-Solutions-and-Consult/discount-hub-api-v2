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

  @IsString({ each: true })
  @IsOptional()
  urls?: string[];
}
