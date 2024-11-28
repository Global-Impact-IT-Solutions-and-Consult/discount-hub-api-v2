import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
  ArrayMinSize,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';

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

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  brands?: Types.ObjectId | string; // Allow ObjectId or string

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  categories?: (Types.ObjectId | string)[]; // Allow array of ObjectId or string

  @ApiProperty({ required: false })
  @IsOptional()
  store?: string;
}
