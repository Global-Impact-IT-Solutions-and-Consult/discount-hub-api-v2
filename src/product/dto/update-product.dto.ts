import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
  ArrayMinSize,
  IsMongoId,
  // IsObject,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
// import { CreateCompanyDto } from 'src/company/dto/create-company.dto';
import { Types } from 'mongoose';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsNumber()
  discountPrice: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  images: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  specifications?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  keyFeatures?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  // @ApiProperty({ type: [String] })
  // @IsArray()
  // @IsMongoId({ each: true })
  // @IsOptional()
  // tags?: string[];

  // @ApiProperty({ type: [String] })
  // @IsArray()
  // @IsMongoId({ each: true })
  // @IsOptional()
  // tagAttributes?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  brand?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  categories?: string[];

  @ApiProperty()
  @IsOptional()
  source?: string;

  // @ApiProperty({ type: CreateCompanyDto })
  // @IsObject()
  // store?: CreateCompanyDto; // Nested store object

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  store?: Types.ObjectId | string; // Allow array of ObjectId or string

  // @ApiProperty({ type: CreateCompanyDto })
  // @IsObject()
  // store?: CreateCompanyDto; // Nested store object

  @ApiProperty({ required: false })
  @IsOptional()
  storeName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  storeLogo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  storeBadgeColor?: string;
}
