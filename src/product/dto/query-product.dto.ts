import { IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from 'src/utils/constants';

export class QueryProductDto extends BaseQueryDto {
  // Text search
  @IsString()
  @IsOptional()
  name?: string;

  // Price ranges
  @IsNumber()
  @IsOptional()
  minPrice?: number;
  @IsNumber()
  @IsOptional()
  maxPrice?: number;
  @IsNumber()
  @IsOptional()
  minDiscountPrice?: number;
  @IsNumber()
  @IsOptional()
  maxDiscountPrice?: number;

  // Rating filters
  @IsNumber()
  @IsOptional()
  minRating?: number;
  @IsNumber()
  @IsOptional()
  minNumberOfRatings?: number;
  @IsNumber()
  @IsOptional()
  maxNumberOfRatings?: number;

  // Store/Company filters
  @IsString()
  @IsOptional()
  storeName?: string;
  @IsMongoId({ each: true })
  @IsOptional()
  storeIds?: string[];

  // Tag filters
  @IsString({ each: true })
  @IsOptional()
  tagNames?: string[];
  @IsMongoId({ each: true })
  @IsOptional()
  tagIds?: string[];

  // Brand filters
  @IsString()
  @IsOptional()
  brandName?: string;
  @IsMongoId({ each: true })
  @IsOptional()
  brandIds?: string[];

  // Category filters
  @IsString()
  @IsOptional()
  categoryName?: string;
  @IsMongoId({ each: true })
  @IsOptional()
  categoryIds?: string[];
}
