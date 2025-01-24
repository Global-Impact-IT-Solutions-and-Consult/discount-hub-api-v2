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
import { Types } from 'mongoose';
// import { CreateCompanyDto } from 'src/company/dto/create-company.dto';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsNumber()
  discountPrice: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  discount?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rating?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  numberOfRatings?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  specifications?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  keyFeatures?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  tagAttributes?: string[];

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  brand?: Types.ObjectId | string; // Allow ObjectId or string

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  categories?: (Types.ObjectId | string)[]; // Allow array of ObjectId or string

  // @ApiProperty({ required: false })
  // @IsOptional()
  // store?: string;

  @ApiProperty({ required: false })
  @IsString()
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
