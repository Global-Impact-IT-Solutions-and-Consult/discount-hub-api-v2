import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsNumber,
  ArrayMinSize,
  IsMongoId,
} from 'class-validator';

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
  description?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  tagAttributes?: string[];

  @ApiProperty()
  @IsMongoId()
  @IsOptional()
  brand?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  categories?: string[];
}
