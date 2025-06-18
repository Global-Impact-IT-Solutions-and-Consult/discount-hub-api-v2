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
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  discountPrice: number;

  @IsString()
  @IsOptional()
  discount?: string;

  @IsString()
  @IsOptional()
  rating?: string;

  @IsString()
  @IsOptional()
  numberOfRatings?: string;

  @IsString()
  image: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  specifications?: string;

  @IsString()
  @IsOptional()
  keyFeatures?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  tags?: string[];

  // @ApiProperty({ type: [String], required: false })
  // @IsArray()
  // @IsMongoId({ each: true })
  // @IsOptional()
  // tagAttributes?: string[];

  @IsMongoId()
  @IsOptional()
  brand?: Types.ObjectId | string; // Allow ObjectId or string

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  categories?: (Types.ObjectId | string)[]; // Allow array of ObjectId or string

  // @ApiProperty({ required: false })
  // @IsOptional()
  // store?: string;

  @IsString()
  @IsMongoId({ each: true })
  @IsOptional()
  store?: Types.ObjectId | string; // Allow array of ObjectId or string
}
