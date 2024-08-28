import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';

export class UpdateStoreDto {
  @ApiProperty({ description: 'Name of the store' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Slug for the store URL' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'URL of the store logo' })
  @IsString()
  logo: string;

  @ApiProperty({ description: 'Website of the store' })
  @IsString()
  website: string;

  @ApiProperty({ type: [String], description: 'Array of URLs' })
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
