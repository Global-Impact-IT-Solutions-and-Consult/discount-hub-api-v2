import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';

export class CreateStoreDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  logo: string;

  @ApiProperty()
  @IsString()
  website: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  url: string[];

  @ApiProperty({ type: [String], description: 'Array of product IDs' })
  @IsArray()
  @IsString({ each: true })
  products: string[];

  @ApiProperty({ description: 'ID of the admin user' })
  @IsString()
  admin: string;
}
